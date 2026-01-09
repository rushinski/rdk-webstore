// src/app/checkout/processing/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutProcessingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your payment...');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
    const paymentIntentId = searchParams.get('payment_intent');
    const fulfillment = searchParams.get('fulfillment');
    const fulfillmentParam = fulfillment ? `&fulfillment=${encodeURIComponent(fulfillment)}` : '';
    const e2eStatus =
      process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1' || process.env.NODE_ENV === 'test'
        ? searchParams.get('e2e_status')
        : null;

    if (!orderId) {
      setStatus('error');
      setMessage('Invalid payment information');
      return;
    }

    if (e2eStatus === 'success' || e2eStatus === 'error' || e2eStatus === 'processing') {
      setStatus(e2eStatus);
      setMessage(`E2E forced status: ${e2eStatus}`);
      return;
    }

    const clearTimers = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const checkPaymentStatus = async () => {
      try {
        if (!paymentIntentClientSecret) {
          return;
        }

        const stripe = await stripePromise;
        if (!stripe) {
          setStatus('error');
          setMessage('Stripe failed to initialize.');
          return;
        }

        const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);

        if (paymentIntent?.status === 'succeeded') {
          setStatus('success');
          setMessage('Payment successful! Redirecting...');
          clearTimers();

          try {
            if (paymentIntentId) {
              const payload: Record<string, string> = { orderId, paymentIntentId };
              if (fulfillment) {
                payload.fulfillment = fulfillment;
              }

              await fetch('/api/checkout/confirm-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
            }
          } catch {
            // ignore confirmation errors; webhook will reconcile
          }

          setTimeout(() => {
            router.push(`/checkout/success?orderId=${orderId}${fulfillmentParam}`);
          }, 1200);
          return;
        }

        if (paymentIntent?.status === 'processing') {
          setMessage('Your payment is processing. Please wait...');
          return;
        }

        if (paymentIntent?.status === 'requires_payment_method' || paymentIntent?.status === 'canceled') {
          setStatus('error');
          setMessage('Payment failed. Please try again.');
          clearTimers();
          return;
        }

        setMessage('Finalizing your payment confirmation...');
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setMessage('An error occurred while processing your payment.');
        clearTimers();
      }
    };

    const pollOrderStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (data?.status === 'paid') {
          setStatus('success');
          setMessage('Payment confirmed! Redirecting...');
          clearTimers();
          setTimeout(() => {
            router.push(`/checkout/success?orderId=${orderId}${fulfillmentParam}`);
          }, 1200);
        }
      } catch {
        // ignore polling errors
      }
    };

    checkPaymentStatus();
    pollOrderStatus();

    pollIntervalRef.current = setInterval(() => {
      checkPaymentStatus();
      pollOrderStatus();
    }, 2500);

    timeoutRef.current = setTimeout(() => {
      setStatus('error');
      setMessage('Payment is taking longer than expected. Please check your account or return to your cart.');
      clearTimers();
    }, 60000);

    return () => {
      clearTimers();
    };
  }, [searchParams, router]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center" data-testid="checkout-processing">
      {status === 'processing' && (
        <>
          <Loader2 className="w-16 h-16 text-red-600 animate-spin mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Processing Payment</h1>
          <p className="text-gray-400" data-testid="processing-message">{message}</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Payment Successful!</h1>
          <p className="text-gray-400" data-testid="success-message">{message}</p>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Payment Failed</h1>
          <p className="text-gray-400 mb-8" data-testid="error-message">{message}</p>
          <button
            onClick={() => router.push('/cart')}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition"
          >
            Return to Cart
          </button>
        </>
      )}
    </div>
  );
}
