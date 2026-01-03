// src/app/checkout/page.tsx (EMBEDDED STRIPE CHECKOUT)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useCart } from '@/components/cart/CartProvider';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { CartItem } from '@/types/views/cart';
import {
  clearIdempotencyKeyFromStorage,
  generateIdempotencyKey,
  getIdempotencyKeyFromStorage,
  setIdempotencyKeyInStorage,
} from '@/lib/idempotency';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const buildCartSignature = (items: CartItem[]) => {
  const sorted = [...items].sort((a, b) => {
    const aKey = `${a.productId}:${a.variantId}`;
    const bKey = `${b.productId}:${b.variantId}`;
    return aKey.localeCompare(bKey);
  });
  return JSON.stringify(
    sorted.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }))
  );
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, isReady } = useCart();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<{ subtotal: number; shipping: number; total: number } | null>(null);
  const [fulfillment, setFulfillment] = useState<'ship' | 'pickup'>('ship');
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingFulfillment, setIsUpdatingFulfillment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;

    if (items.length === 0) {
      router.push('/cart');
      return;
    }
  }, [items, router, isReady]);

  useEffect(() => {
    if (!isReady || items.length === 0) return;

    const signature = buildCartSignature(items);

    try {
      const storedSignature = sessionStorage.getItem('checkout_cart_signature');
      const storedKey = getIdempotencyKeyFromStorage();

      if (!storedKey || storedSignature !== signature) {
        const nextKey = generateIdempotencyKey();
        try {
          setIdempotencyKeyInStorage(nextKey);
          sessionStorage.setItem('checkout_cart_signature', signature);
        } catch {
          // ignore storage errors
        }
        setIdempotencyKey(nextKey);
        setClientSecret(null);
        setOrderId(null);
        setPricing(null);
        return;
      }

      setIdempotencyKey(storedKey);
    } catch {
      const fallbackKey = generateIdempotencyKey();
      try {
        setIdempotencyKeyInStorage(fallbackKey);
      } catch {
        // ignore storage errors
      }
      setIdempotencyKey(fallbackKey);
    }
  }, [isReady, items]);

  useEffect(() => {
    if (!isReady || items.length === 0 || !idempotencyKey) return;

    let isActive = true;
    const createPaymentIntent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/checkout/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idempotencyKey,
            fulfillment,
            items: items.map(item => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data?.code === 'CART_MISMATCH' || data?.code === 'IDEMPOTENCY_KEY_EXPIRED' || data?.code === 'PAYMENT_INTENT_CANCELED') {
            clearIdempotencyKeyFromStorage();
            const signature = buildCartSignature(items);
            const nextKey = generateIdempotencyKey();
            try {
              sessionStorage.setItem('checkout_cart_signature', signature);
            } catch {
              // ignore storage errors
            }
            try {
              setIdempotencyKeyInStorage(nextKey);
            } catch {
              // ignore storage errors
            }
            setIdempotencyKey(nextKey);
            return;
          }
          throw new Error(data.error || 'Failed to create payment intent');
        }

        if (data?.status === 'paid') {
          router.push(`/checkout/success?orderId=${data.orderId}`);
          return;
        }

        if (!isActive) return;
        setClientSecret(data.clientSecret);
        setOrderId(data.orderId);
        setPricing({
          subtotal: Number(data.subtotal ?? 0),
          shipping: Number(data.shipping ?? 0),
          total: Number(data.total ?? 0),
        });
        if (data.fulfillment === 'pickup' || data.fulfillment === 'ship') {
          setFulfillment(data.fulfillment);
        }
      } catch (err: any) {
        if (!isActive) return;
        console.error('Payment intent error:', err);
        setError(err.message || 'Failed to initialize checkout');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    createPaymentIntent();
    return () => {
      isActive = false;
    };
  }, [idempotencyKey, items, isReady, router]);

  const handleFulfillmentChange = async (next: 'ship' | 'pickup') => {
    if (next === fulfillment || !orderId) {
      setFulfillment(next);
      return;
    }

    setIsUpdatingFulfillment(true);
    setError(null);
    const previous = fulfillment;
    setFulfillment(next);

    try {
      const response = await fetch('/api/checkout/update-fulfillment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, fulfillment: next }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update fulfillment');
      }

      setPricing({
        subtotal: Number(data.subtotal ?? 0),
        shipping: Number(data.shipping ?? 0),
        total: Number(data.total ?? 0),
      });
    } catch (err: any) {
      console.error('Fulfillment update error:', err);
      setError(err.message || 'Failed to update fulfillment');
      setFulfillment(previous);
    } finally {
      setIsUpdatingFulfillment(false);
    }
  };

  if (!isReady || items.length === 0) {
    return null;
  }

  if (isLoading || !pricing) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
          <p className="text-gray-400">Initializing secure checkout...</p>
        </div>
      </div>
    );
  }

  if (error && !clientSecret) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="bg-red-900/20 border border-red-500 text-red-400 p-6 rounded">
          <h2 className="text-xl font-bold mb-2">Checkout Error</h2>
          <p>{error}</p>
          <button
            onClick={() => router.push('/cart')}
            className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
          >
            Return to Cart
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/cart')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to cart
        </button>
        <h1 className="text-3xl font-bold text-white">Checkout</h1>
        <span className="w-24" aria-hidden="true" />
      </div>

      {error ? (
        <div className="mb-6 bg-red-900/20 border border-red-500 text-red-400 p-4 rounded">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Checkout Form */}
        <div className="lg:col-span-2">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: '#dc2626',
                  colorBackground: '#18181b',
                  colorText: '#ffffff',
                  colorDanger: '#ef4444',
                  fontFamily: 'system-ui, sans-serif',
                  borderRadius: '4px',
                },
              },
            }}
          >
            <CheckoutForm
              orderId={orderId!}
              items={items}
              total={pricing.total}
              fulfillment={fulfillment}
              onFulfillmentChange={handleFulfillmentChange}
              isUpdatingFulfillment={isUpdatingFulfillment}
            />
          </Elements>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <OrderSummary
            items={items}
            subtotal={pricing.subtotal}
            shipping={pricing.shipping}
            total={pricing.total}
            fulfillment={fulfillment}
          />
        </div>
      </div>
    </div>
  );
}
