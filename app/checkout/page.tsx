// src/app/checkout/page.tsx (FIXED - Shows items, shipping, better error handling)

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/CartProvider';
import { generateIdempotencyKey, setIdempotencyKeyInStorage } from '@/lib/idempotency';
import type { CheckoutSessionRequest } from '@/types/views/checkout';
import type { CartItem } from '@/types/views/cart';
import Image from 'next/image';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total } = useCart();
  const [fulfillment, setFulfillment] = useState<'ship' | 'pickup'>('ship');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  // Calculate shipping cost when items or fulfillment changes
  useEffect(() => {
    const calculateShipping = async () => {
      if (fulfillment === 'pickup' || items.length === 0) {
        setShippingCost(0);
        return;
      }

      setIsCalculatingShipping(true);
      try {
        // Get unique product IDs
        const productIds = [...new Set(items.map(item => item.productId))];
        
        // Fetch shipping defaults for these products
        const response = await fetch('/api/checkout/calculate-shipping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds }),
        });

        if (response.ok) {
          const data = await response.json();
          setShippingCost(data.shippingCost);
        } else {
          setShippingCost(null);
        }
      } catch (err) {
        console.error('Failed to calculate shipping:', err);
        setShippingCost(null);
      } finally {
        setIsCalculatingShipping(false);
      }
    };

    calculateShipping();
  }, [items, fulfillment]);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      setIdempotencyKeyInStorage(idempotencyKey);

      const request: CheckoutSessionRequest = {
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        fulfillment,
        idempotencyKey,
      };

      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'CART_MISMATCH' || data.code === 'IDEMPOTENCY_KEY_EXPIRED') {
          // Generate new key and retry
          const newKey = generateIdempotencyKey();
          setIdempotencyKeyInStorage(newKey);
          return handleCheckout();
        }
        throw new Error(data.message || data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'An error occurred during checkout');
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  const subtotal = total;
  const shipping = fulfillment === 'pickup' ? 0 : (shippingCost ?? 0);
  const orderTotal = subtotal + shipping;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-white mb-8">Checkout</h1>

      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 p-4 rounded mb-6">
          {error}
        </div>
      )}

      {/* Order Items */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Order Items</h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={`${item.productId}-${item.variantId}`} className="flex gap-4">
              {item.imageUrl && (
                <div className="relative w-20 h-20 flex-shrink-0 bg-zinc-800 rounded overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">
                  {item.brand} {item.name}
                </h3>
                {item.sizeLabel && (
                  <p className="text-sm text-gray-400">Size: {item.sizeLabel}</p>
                )}
                <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">
                  ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  ${(item.priceCents / 100).toFixed(2)} each
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fulfillment Method */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Fulfillment Method</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="fulfillment"
              value="ship"
              checked={fulfillment === 'ship'}
              onChange={() => setFulfillment('ship')}
              className="w-4 h-4"
            />
            <span className="text-white">
              Ship to me {shippingCost !== null && fulfillment === 'ship' && (
                <span className="text-gray-400">
                  (${(shippingCost / 100).toFixed(2)} flat rate)
                </span>
              )}
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="fulfillment"
              value="pickup"
              checked={fulfillment === 'pickup'}
              onChange={() => setFulfillment('pickup')}
              className="w-4 h-4"
            />
            <span className="text-white">Local pickup (free)</span>
          </label>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>
        <div className="space-y-2 text-gray-400">
          <div className="flex justify-between">
            <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
            <span>${(subtotal / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            {isCalculatingShipping ? (
              <span className="text-gray-500">Calculating...</span>
            ) : fulfillment === 'pickup' ? (
              <span>Free</span>
            ) : shippingCost !== null ? (
              <span>${(shipping / 100).toFixed(2)}</span>
            ) : (
              <span className="text-gray-500">TBD</span>
            )}
          </div>
          <div className="border-t border-zinc-800/70 pt-2 mt-2">
            <div className="flex justify-between text-xl font-bold text-white">
              <span>Total</span>
              <span>${(orderTotal / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleCheckout}
        disabled={isLoading || isCalculatingShipping}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded transition text-lg"
      >
        {isLoading ? 'Creating checkout session...' : 'Proceed to Payment'}
      </button>

      <p className="text-xs text-gray-500 text-center mt-4">
        Secure checkout powered by Stripe. You&apos;ll enter payment details on the next page.
      </p>
    </div>
  );
}