// src/components/checkout/CheckoutForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ShippingAddressForm } from './ShippingAddressForm';
import { SavedAddresses } from './SavedAddresses';
import { Loader2, Lock, Package, TruckIcon } from 'lucide-react';
import type { CartItem } from '@/types/views/cart';
import Link from 'next/link';

interface CheckoutFormProps {
  orderId: string;
  items: CartItem[];
  total: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export function CheckoutForm({ orderId, items, total }: CheckoutFormProps) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const [fulfillment, setFulfillment] = useState<'ship' | 'pickup'>('ship');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    if (fulfillment === 'ship' && !shippingAddress) {
      setError('Please provide a shipping address');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Submit the payment to Stripe
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Confirm the payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/processing?orderId=${orderId}`,
          shipping: fulfillment === 'ship' && shippingAddress ? {
            name: shippingAddress.name,
            phone: shippingAddress.phone,
            address: {
              line1: shippingAddress.line1,
              line2: shippingAddress.line2 || '',
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.postalCode,
              country: shippingAddress.country,
            },
          } : undefined,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // Payment succeeded
      if (paymentIntent?.status === 'succeeded') {
        // Confirm with our backend
        await fetch('/api/checkout/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            paymentIntentId: paymentIntent.id,
            fulfillment,
            shippingAddress: fulfillment === 'ship' ? shippingAddress : null,
          }),
        });

        router.push(`/checkout/success?orderId=${orderId}`);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 p-4 rounded">
          {error}
        </div>
      )}

      {/* Fulfillment Method */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Delivery Method
        </h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer p-4 border border-zinc-800 rounded hover:border-zinc-700 transition">
            <input
              type="radio"
              name="fulfillment"
              value="ship"
              checked={fulfillment === 'ship'}
              onChange={() => setFulfillment('ship')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-4 h-4 text-gray-400" />
                <span className="text-white font-medium">Ship to me</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Standard shipping - calculated based on your items
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer p-4 border border-zinc-800 rounded hover:border-zinc-700 transition">
            <input
              type="radio"
              name="fulfillment"
              value="pickup"
              checked={fulfillment === 'pickup'}
              onChange={() => setFulfillment('pickup')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                <span className="text-white font-medium">Local pickup</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Free - Pick up at our location
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Shipping Address */}
      {fulfillment === 'ship' && (
        <>
          <SavedAddresses
            onSelectAddress={setShippingAddress}
            selectedAddressId={selectedAddressId}
            onSelectAddressId={setSelectedAddressId}
          />

          <ShippingAddressForm
            onAddressChange={setShippingAddress}
            initialAddress={shippingAddress}
          />
        </>
      )}

      {/* Payment Method */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Payment Information
        </h2>

        <div className="mb-4 p-3 bg-zinc-950 border border-zinc-800 rounded text-sm text-gray-400">
          <p className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            All payment information is securely processed by Stripe. We never store your card details.
          </p>
        </div>

        <PaymentElement />
      </div>

      {/* Legal Agreements */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1"
          />
          <div className="text-sm text-gray-400">
            <p>
              By placing your order, you agree to our{' '}
              <Link href="/legal/terms" className="text-red-500 hover:text-red-400 underline">
                Terms of Service
              </Link>
              {', '}
              <Link href="/legal/privacy" className="text-red-500 hover:text-red-400 underline">
                Privacy Policy
              </Link>
              {', '}
              <Link href="/legal/refund-policy" className="text-red-500 hover:text-red-400 underline">
                Refund Policy
              </Link>
              {', and '}
              <Link href="/legal/shipping-policy" className="text-red-500 hover:text-red-400 underline">
                Shipping Policy
              </Link>
              .
            </p>
            <p className="mt-2">
              You also agree to all of the terms found in our policies and acknowledge that orders are final once placed.
            </p>
          </div>
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing || !agreedToTerms}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition text-lg flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing payment...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Place Order - ${(total / 100).toFixed(2)}
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-500">
        Secure checkout powered by Stripe
      </p>
    </form>
  );
}