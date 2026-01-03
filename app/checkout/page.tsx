// src/app/checkout/page.tsx (EMBEDDED STRIPE CHECKOUT)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useCart } from '@/components/cart/CartProvider';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import type { CartItem } from '@/types/views/cart';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total } = useCart();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
      return;
    }

    const createPaymentIntent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/checkout/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map(item => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create payment intent');
        }

        setClientSecret(data.clientSecret);
        setOrderId(data.orderId);
      } catch (err: any) {
        console.error('Payment intent error:', err);
        setError(err.message || 'Failed to initialize checkout');
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [items, router]);

  if (items.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
          <p className="text-gray-400">Initializing secure checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
      <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>

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
              total={total}
            />
          </Elements>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <OrderSummary items={items} total={total} />
        </div>
      </div>
    </div>
  );
}