// src/app/checkout/cancel/page.tsx (NEW)

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { clearIdempotencyKeyFromStorage } from '@/lib/idempotency';

export default function CheckoutCancelPage() {
  const router = useRouter();

  useEffect(() => {
    clearIdempotencyKeyFromStorage();
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-white mb-4">Checkout Canceled</h1>
      <p className="text-gray-400 mb-8">
        Your order has been canceled. No charges were made to your account.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => router.push('/cart')}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition"
        >
          Return to Cart
        </button>
        <button
          onClick={() => router.push('/store')}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded transition"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}