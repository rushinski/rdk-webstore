// src/app/checkout/success/page.tsx (NEW)

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import { clearIdempotencyKeyFromStorage } from '@/lib/idempotency';
import type { OrderStatusResponse } from '@/types/views/checkout';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<OrderStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatReady, setChatReady] = useState(false);

  useEffect(() => {
    if (!orderId) {
      router.push('/cart');
      return;
    }

    clearIdempotencyKeyFromStorage();

    let pollInterval: NodeJS.Timeout;

    const pollOrderStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch order status');
        }

        const data: OrderStatusResponse = await response.json();
        setStatus(data);

        if (data.status === 'paid') {
          setIsPolling(false);
          clearInterval(pollInterval);
        }
      } catch (err: any) {
        setError(err.message);
        setIsPolling(false);
        clearInterval(pollInterval);
      }
    };

    // Initial poll
    pollOrderStatus();

    // Poll every 2 seconds until paid
    pollInterval = setInterval(pollOrderStatus, 2000);

    return () => clearInterval(pollInterval);
  }, [orderId, router]);

  useEffect(() => {
    if (!status || status.status !== 'paid' || status.fulfillment !== 'pickup') return;
    if (chatReady) return;

    const ensureChat = async () => {
      try {
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: status.id }),
        });

        if (response.ok) {
          setChatReady(true);
        }
      } catch (error) {
        // Chat creation can be retried when the user opens chat
      }
    };

    ensureChat();
  }, [status, chatReady]);

  if (!orderId) {
    return null;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-900/20 border border-red-500 text-red-400 p-6 rounded">
          <p className="text-lg font-semibold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (isPolling || !status || status.status !== 'paid') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-16 h-16 text-red-600 mx-auto mb-6 animate-spin" />
        <h1 className="text-3xl font-bold text-white mb-4">Processing your payment...</h1>
        <p className="text-gray-400 mb-8">
          Please wait while we confirm your order. This should only take a moment.
        </p>
        {status && (
          <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 text-left">
            <div className="flex justify-between text-gray-400 mb-2">
              <span>Order ID:</span>
              <span className="text-white font-mono text-sm">{status.id}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Status:</span>
              <span className="text-yellow-500 capitalize">{status.status}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-white mb-4">Order Confirmed!</h1>
      <p className="text-gray-400 mb-8">
        Thank you for your purchase. Your order has been successfully processed.
      </p>

      <div className="bg-zinc-900 border border-zinc-800/70 rounded p-6 mb-6 text-left">
        <h2 className="text-xl font-semibold text-white mb-4">Order Details</h2>
        <div className="space-y-2 text-gray-400">
          <div className="flex justify-between">
            <span>Order ID:</span>
            <span className="text-white font-mono text-sm">{status.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="text-white">${status.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping:</span>
            <span className="text-white">
              {status.fulfillment === 'pickup' ? 'Free (Pickup)' : `$${status.shipping.toFixed(2)}`}
            </span>
          </div>
          <div className="border-t border-zinc-800/70 pt-2 mt-2">
            <div className="flex justify-between text-xl font-bold">
              <span className="text-white">Total:</span>
              <span className="text-white">${status.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {status.fulfillment === 'pickup' && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openChat'))}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded transition"
          >
            Open pickup chat
          </button>
        )}
        <button
          onClick={() => router.push('/account/orders')}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition"
        >
          View Order History
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

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-16 h-16 text-red-600 mx-auto animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
