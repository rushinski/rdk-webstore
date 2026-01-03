// src/app/checkout/processing/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useStripe } from '@stripe/react-stripe-js';

export default function CheckoutProcessingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stripe = useStripe();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your payment...');

  useEffect(() => {
    if (!stripe) return;

    const orderId = searchParams.get('orderId');
    const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');

    if (!orderId || !paymentIntentClientSecret) {
      setStatus('error');
      setMessage('Invalid payment information');
      return;
    }

    const checkPaymentStatus = async () => {
      try {
        const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);

        if (paymentIntent?.status === 'succeeded') {
          setStatus('success');
          setMessage('Payment successful! Redirecting...');
          
          // Redirect to success page after 2 seconds
          setTimeout(() => {
            router.push(`/checkout/success?orderId=${orderId}`);
          }, 2000);
        } else if (paymentIntent?.status === 'processing') {
          setMessage('Your payment is processing. Please wait...');
        } else {
          setStatus('error');
          setMessage('Payment failed. Please try again.');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setMessage('An error occurred while processing your payment.');
      }
    };

    checkPaymentStatus();
  }, [stripe, searchParams, router]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      {status === 'processing' && (
        <>
          <Loader2 className="w-16 h-16 text-red-600 animate-spin mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Processing Payment</h1>
          <p className="text-gray-400">{message}</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Payment Successful!</h1>
          <p className="text-gray-400">{message}</p>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Payment Failed</h1>
          <p className="text-gray-400 mb-8">{message}</p>
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