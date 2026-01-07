// src/components/checkout/CheckoutForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExpressCheckoutElement, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ShippingAddressForm } from './ShippingAddressForm';
import { SavedAddresses } from './SavedAddresses';
import { Loader2, Lock, Package, TruckIcon } from 'lucide-react';
import Link from 'next/link';
import type { CartItem } from '@/types/views/cart';

interface CheckoutFormProps {
  orderId: string;
  items: CartItem[];
  total: number;
  fulfillment: 'ship' | 'pickup';
  onFulfillmentChange: (fulfillment: 'ship' | 'pickup') => void;
  isUpdatingFulfillment?: boolean;
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

export function CheckoutForm({
  orderId,
  items,
  total,
  fulfillment,
  onFulfillmentChange,
  isUpdatingFulfillment = false,
}: CheckoutFormProps) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmBackendPayment = async (paymentIntentId: string) => {
    const response = await fetch('/api/checkout/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        paymentIntentId,
        fulfillment,
        shippingAddress: fulfillment === 'ship' ? shippingAddress : null,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok && !data?.processing) {
      throw new Error(data.error || 'Failed to confirm payment');
    }
  };

  const handlePayment = async (withSubmit: boolean) => {
    const e2eStatus =
      process.env.NODE_ENV === 'test'
        ? new URLSearchParams(window.location.search).get('e2e_payment_status')
        : null;
    if (e2eStatus) {
      setIsProcessing(true);
      setError(null);
      const params = new URLSearchParams(window.location.search);
      const intentId = params.get('e2e_payment_intent_id') ?? 'pi_test_e2e';
      try {
        if (e2eStatus === 'success') {
          await confirmBackendPayment(intentId);
          router.push(`/checkout/success?orderId=${orderId}`);
          return { ok: true };
        }
        if (e2eStatus === 'processing' || e2eStatus === 'requires_action') {
          const statusParam = e2eStatus === 'processing' ? 'processing' : 'processing';
          router.push(`/checkout/processing?orderId=${orderId}&e2e_status=${statusParam}`);
          return { ok: true };
        }
        if (e2eStatus === 'canceled' || e2eStatus === 'requires_payment_method') {
          throw new Error('Payment failed. Please try again.');
        }
      } catch (err: any) {
        const message = err.message || 'Payment failed. Please try again.';
        setError(message);
        return { ok: false, error: message };
      } finally {
        setIsProcessing(false);
      }
    }

    if (!stripe || !elements) {
      setError('Stripe is still loading. Please wait a moment.');
      return { ok: false, error: 'Stripe not ready' };
    }

    if (fulfillment === 'ship' && !shippingAddress) {
      const message = 'Please provide a shipping address';
      setError(message);
      return { ok: false, error: message };
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (withSubmit) {
        const { error: submitError } = await elements.submit();
        if (submitError) {
          throw new Error(submitError.message);
        }
      }

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

      if (!paymentIntent) {
        throw new Error('Payment failed. Please try again.');
      }

      if (paymentIntent.status === 'succeeded') {
        await confirmBackendPayment(paymentIntent.id);
        router.push(`/checkout/success?orderId=${orderId}`);
        return { ok: true };
      }

      if (paymentIntent.status === 'processing') {
        const secretParam = paymentIntent.client_secret
          ? `&payment_intent_client_secret=${encodeURIComponent(paymentIntent.client_secret)}`
          : '';
        const intentParam = paymentIntent.id ? `&payment_intent=${paymentIntent.id}` : '';
        router.push(`/checkout/processing?orderId=${orderId}${intentParam}${secretParam}`);
        return { ok: true };
      }

      if (paymentIntent.status === 'requires_action') {
        const secretParam = paymentIntent.client_secret
          ? `&payment_intent_client_secret=${encodeURIComponent(paymentIntent.client_secret)}`
          : '';
        const intentParam = paymentIntent.id ? `&payment_intent=${paymentIntent.id}` : '';
        router.push(`/checkout/processing?orderId=${orderId}${intentParam}${secretParam}`);
        return { ok: true };
      }

      throw new Error('Payment failed. Please try again.');
    } catch (err: any) {
      console.error('Payment error:', err);
      const message = err.message || 'Payment failed. Please try again.';
      setError(message);
      return { ok: false, error: message };
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handlePayment(true);
  };

  const handleExpressConfirm = async (event: any) => {
    if (isUpdatingFulfillment || isProcessing) {
      event.paymentFailed({ reason: 'fail', message: 'Please wait a moment and try again.' });
      return;
    }
    const result = await handlePayment(false);
    if (!result.ok) {
      event.paymentFailed({ reason: 'fail', message: result.error });
    }
  };

  const handleExpressClick = (event: any) => {
    const lineItems = items.map((item) => ({
      name: item.titleDisplay,
      amount: item.priceCents * item.quantity,
    }));

    const totalCents = Math.round(total * 100);
    const itemsTotalCents = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const shippingCents = Math.max(totalCents - itemsTotalCents, 0);

    if (fulfillment === 'ship' && shippingCents > 0) {
      lineItems.push({ name: 'Shipping', amount: shippingCents });
    }

    event.resolve({ lineItems });
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
              onChange={() => onFulfillmentChange('ship')}
              className="mt-1"
              disabled={isUpdatingFulfillment || isProcessing}
              data-testid="fulfillment-ship"
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
              onChange={() => onFulfillmentChange('pickup')}
              className="mt-1"
              disabled={isUpdatingFulfillment || isProcessing}
              data-testid="fulfillment-pickup"
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

        <div className="mb-4">
          <ExpressCheckoutElement
            onConfirm={handleExpressConfirm}
            onClick={handleExpressClick}
            options={{
              layout: { maxColumns: 2 },
              paymentMethodOrder: ['apple_pay', 'google_pay'],
              paymentMethods: {
                applePay: 'auto',
                googlePay: 'auto',
                amazonPay: 'never',
                klarna: 'never',
                paypal: 'never',
                link: 'auto',
              },
            }}
          />
        </div>

        <div className="text-xs uppercase tracking-widest text-center text-gray-500 mb-4">
          Or pay with card
        </div>

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
            .
          </p>
        </div>

        <details className="mt-4 rounded border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-gray-400">
          <summary className="cursor-pointer list-none text-white font-semibold flex items-center justify-between">
            Refund Policy
            <span className="text-xs text-gray-500">View</span>
          </summary>
          <div className="mt-3 space-y-2">
            <p>Refunds are reviewed per our policy for eligible items and timelines.</p>
            <Link href="/refunds" className="text-red-500 hover:text-red-400 underline block">
              Read the full refund policy
            </Link>
          </div>
        </details>
        <details className="mt-3 rounded border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-gray-400">
          <summary className="cursor-pointer list-none text-white font-semibold flex items-center justify-between">
            Shipping Policy
            <span className="text-xs text-gray-500">View</span>
          </summary>
          <div className="mt-3 space-y-2">
            <p>Shipping timelines and costs depend on your delivery option at checkout.</p>
            <Link href="/shipping" className="text-red-500 hover:text-red-400 underline block">
              Read the full shipping policy
            </Link>
          </div>
        </details>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing || isUpdatingFulfillment}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition text-lg flex items-center justify-center gap-2"
        data-testid="checkout-submit"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing payment...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Place Order - ${total.toFixed(2)}
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-500">
        Secure checkout powered by Stripe
      </p>
    </form>
  );
}
