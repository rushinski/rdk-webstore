// src/app/checkout/page.tsx (CORRECTED)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/CartProvider';
import { generateIdempotencyKey, setIdempotencyKeyInStorage } from '@/lib/idempotency';
import type { CheckoutSessionRequest } from '@/types/views/checkout';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total } = useCart();
  const [fulfillment, setFulfillment] = useState<'ship' | 'pickup'>('ship');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (!response.ok) {
        const data = await response.json();
        if (data.code === 'CART_MISMATCH' || data.code === 'IDEMPOTENCY_KEY_EXPIRED') {
          // FIXED: Generate new key properly
          const newKey = generateIdempotencyKey();
          setIdempotencyKeyInStorage(newKey);
          return handleCheckout(); // Retry with new key
        }
        throw new Error(data.message || 'Failed to create checkout session');
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-white mb-8">Checkout</h1>

      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 p-4 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-zinc-900 border border-red-900/20 rounded p-6 mb-6">
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
            <span className="text-white">Ship to me (shipping calculated at checkout)</span>
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

      <div className="bg-zinc-900 border border-red-900/20 rounded p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>
        <div className="space-y-2 text-gray-400">
          <div className="flex justify-between">
            <span>Subtotal ({items.length} items)</span>
            <span>${(total / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{fulfillment === 'pickup' ? 'Free' : 'Calculated at checkout'}</span>
          </div>
          <div className="border-t border-red-900/20 pt-2 mt-2">
            <div className="flex justify-between text-xl font-bold text-white">
              <span>Total</span>
              <span>${(total / 100).toFixed(2)}+</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleCheckout}
        disabled={isLoading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-4 rounded transition text-lg"
      >
        {isLoading ? 'Creating checkout session...' : 'Proceed to Payment'}
      </button>
    </div>
  );
}