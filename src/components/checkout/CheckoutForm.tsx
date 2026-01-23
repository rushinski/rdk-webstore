// src/components/checkout/CheckoutForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExpressCheckoutElement,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { SavedAddresses } from "./SavedAddresses";
import { Loader2, Lock, Package, TruckIcon } from "lucide-react";
import Link from "next/link";
import type { CartItem } from "@/types/domain/cart";

interface CheckoutFormProps {
  orderId: string;
  items: CartItem[];
  total: number;
  fulfillment: "ship" | "pickup";
  shippingAddress: ShippingAddress | null;
  onShippingAddressChange: (address: ShippingAddress | null) => void;
  onFulfillmentChange: (fulfillment: "ship" | "pickup") => void;
  isUpdatingFulfillment?: boolean;
  canUseChat?: boolean;
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
  shippingAddress,
  onShippingAddressChange,
  onFulfillmentChange,
  isUpdatingFulfillment = false,
  canUseChat = false,
}: CheckoutFormProps) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentElementError, setPaymentElementError] = useState<string | null>(null);

  const canBypassStripe =
    (process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1" || process.env.NODE_ENV === "test") &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("e2e_payment_status");
  const isStripeReady = Boolean(stripe) || canBypassStripe;

  const toApiShippingAddress = (address: ShippingAddress | null) =>
    address
      ? {
          name: address.name,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2 ?? null,
          city: address.city,
          state: address.state.trim().toUpperCase(),
          postal_code: address.postalCode.trim(),
          country: address.country.trim().toUpperCase(),
        }
      : null;

  const confirmBackendPayment = async (paymentIntentId: string) => {
    const response = await fetch("/api/checkout/confirm-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        paymentIntentId,
        fulfillment,
        shippingAddress: fulfillment === "ship" ? toApiShippingAddress(shippingAddress) : null,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok && !data?.processing) {
      throw new Error(data.error || "Failed to confirm payment");
    }
  };

  const handlePayment = async (withSubmit: boolean) => {
    const e2eStatus =
      process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1" || process.env.NODE_ENV === "test"
        ? new URLSearchParams(window.location.search).get("e2e_payment_status")
        : null;

    if (e2eStatus) {
      setIsProcessing(true);
      setError(null);
      const params = new URLSearchParams(window.location.search);
      const intentId = params.get("e2e_payment_intent_id") ?? "pi_test_e2e";
      try {
        if (e2eStatus === "success") {
          await confirmBackendPayment(intentId);
          router.push(`/checkout/success?orderId=${orderId}&fulfillment=${fulfillment}`);
          return { ok: true };
        }
        if (e2eStatus === "processing" || e2eStatus === "requires_action") {
          const statusParam = e2eStatus === "processing" ? "processing" : "processing";
          router.push(
            `/checkout/processing?orderId=${orderId}&e2e_status=${statusParam}&fulfillment=${fulfillment}`,
          );
          return { ok: true };
        }
        if (e2eStatus === "canceled" || e2eStatus === "requires_payment_method") {
          throw new Error("Payment failed. Please try again.");
        }
      } catch (err: any) {
        const message = err.message || "Payment failed. Please try again.";
        setError(message);
        return { ok: false, error: message };
      } finally {
        setIsProcessing(false);
      }
    }

    if (!stripe || !elements) {
      setError("Stripe is still loading. Please wait a moment.");
      return { ok: false, error: "Stripe not ready" };
    }

    if (fulfillment === "ship" && !shippingAddress) {
      const message = "Please add a shipping address";
      setError(message);
      return { ok: false, error: message };
    }

    if (withSubmit && !paymentComplete) {
      const message = paymentElementError ?? "Please enter your card details to continue.";
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
          return_url: `${window.location.origin}/checkout/processing?orderId=${orderId}&fulfillment=${fulfillment}`,
          shipping:
            fulfillment === "ship" && shippingAddress
              ? {
                  name: shippingAddress.name,
                  phone: shippingAddress.phone,
                  address: {
                    line1: shippingAddress.line1,
                    line2: shippingAddress.line2 || "",
                    city: shippingAddress.city,
                    state: shippingAddress.state.trim().toUpperCase(),
                    postal_code: shippingAddress.postalCode.trim(),
                    country: shippingAddress.country.trim().toUpperCase(),
                  },
                }
              : undefined,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (!paymentIntent) {
        throw new Error("Payment failed. Please try again.");
      }

      if (paymentIntent.status === "succeeded") {
        await confirmBackendPayment(paymentIntent.id);
        router.push(`/checkout/success?orderId=${orderId}&fulfillment=${fulfillment}`);
        return { ok: true };
      }

      if (paymentIntent.status === "processing") {
        const secretParam = paymentIntent.client_secret
          ? `&payment_intent_client_secret=${encodeURIComponent(paymentIntent.client_secret)}`
          : "";
        const intentParam = paymentIntent.id ? `&payment_intent=${paymentIntent.id}` : "";
        router.push(
          `/checkout/processing?orderId=${orderId}${intentParam}${secretParam}&fulfillment=${fulfillment}`,
        );
        return { ok: true };
      }

      if (paymentIntent.status === "requires_action") {
        const secretParam = paymentIntent.client_secret
          ? `&payment_intent_client_secret=${encodeURIComponent(paymentIntent.client_secret)}`
          : "";
        const intentParam = paymentIntent.id ? `&payment_intent=${paymentIntent.id}` : "";
        router.push(
          `/checkout/processing?orderId=${orderId}${intentParam}${secretParam}&fulfillment=${fulfillment}`,
        );
        return { ok: true };
      }

      throw new Error("Payment failed. Please try again.");
    } catch (err: any) {
      console.error("Payment error:", err);
      const message = err.message || "Payment failed. Please try again.";
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
      event.paymentFailed({
        reason: "fail",
        message: "Please wait a moment and try again.",
      });
      return;
    }
    const result = await handlePayment(false);
    if (!result.ok) {
      event.paymentFailed({ reason: "fail", message: result.error });
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

    if (fulfillment === "ship" && shippingCents > 0) {
      lineItems.push({ name: "Shipping", amount: shippingCents });
    }

    event.resolve({ lineItems });
  };

  const handleShippingAddressSelect = (address: ShippingAddress) => {
    onShippingAddressChange(address);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 p-4 rounded text-sm sm:text-base">
          {error}
        </div>
      )}

      {/* Fulfillment Method */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Delivery Method
        </h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer p-4 border border-zinc-800 rounded hover:border-zinc-700 transition">
            <input
              type="radio"
              name="fulfillment"
              value="ship"
              checked={fulfillment === "ship"}
              onChange={() => onFulfillmentChange("ship")}
              className="rdk-radio mt-1"
              disabled={isUpdatingFulfillment || isProcessing}
              data-testid="fulfillment-ship"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-4 h-4 text-gray-400" />
                <span className="text-white font-medium text-base">Ship to me</span>
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
              checked={fulfillment === "pickup"}
              onChange={() => onFulfillmentChange("pickup")}
              className="rdk-radio mt-1"
              disabled={isUpdatingFulfillment || isProcessing}
              data-testid="fulfillment-pickup"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                <span className="text-white font-medium text-base">Local pickup</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Free - Pick up at our location</p>
            </div>
          </label>
        </div>

        {fulfillment === "pickup" && (
          <div className="mt-4 border border-zinc-800/70 bg-zinc-950/40 rounded p-4 text-sm text-gray-400 space-y-2">
            <p className="font-medium text-white mb-2">Pickup Information</p>
            <p>
              After purchase, you will receive a pickup email you can reply to for scheduling.
            </p>
            <p>
              You can also DM us on{" "}
              <a
                href="https://instagram.com/realdealkickzllc"
                className="text-red-400 hover:text-red-300"
                target="_blank"
                rel="noreferrer"
              >
                Instagram @realdealkickzllc
              </a>
              .
            </p>
            {canUseChat && <p>Signed-in customers can also use the in-app pickup chat.</p>}
            
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <p className="font-medium text-white mb-2">Returns &amp; Refunds</p>
              <p>All sales are final except as outlined in our Returns &amp; Refunds policy.</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                <Link href="/refunds" className="text-red-500 hover:text-red-400 underline">
                  Returns &amp; Refunds Policy
                </Link>
              </div>
            </div>
          </div>
        )}

        {fulfillment === "ship" && (
          <div className="mt-4 border border-zinc-800/70 bg-zinc-950/40 rounded p-4 text-sm text-gray-400 space-y-2">
            <p className="font-medium text-white mb-2">Shipping Information</p>
            <p>
              We aim to ship within 24 hours (processing time, not delivery time).
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
              <Link href="/shipping" className="text-red-500 hover:text-red-400 underline">
                  Shipping Policy
              </Link>
            </div>
            
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <p className="font-medium text-white mb-2">Returns &amp; Refunds</p>
              <p>All sales are final except as outlined in our Returns &amp; Refunds policy.</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                <Link href="/refunds" className="text-red-500 hover:text-red-400 underline">
                  Returns &amp; Refunds Policy
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shipping Address */}
      {fulfillment === "ship" && (
        <SavedAddresses
          onSelectAddress={handleShippingAddressSelect}
          selectedAddressId={selectedAddressId}
          onSelectAddressId={setSelectedAddressId}
          isGuest={!canUseChat}
        />
      )}

      {/* Payment Method */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Payment Information
        </h2>

        <div className="mb-4">
          <ExpressCheckoutElement
            options={{
              layout: {
                overflow: "never", 
              },
            }}
            onConfirm={handleExpressConfirm}
            onClick={handleExpressClick}
          />
        </div>

        <div className="text-xs uppercase tracking-widest text-center text-gray-500 mb-4">
          Or pay with card
        </div>

        <PaymentElement
          onChange={(event) => {
            setPaymentComplete(event.complete);
            if (event.complete) {
              setPaymentElementError(null);
            } else if (event.empty) {
              setPaymentElementError(null);
            } else {
              setPaymentElementError(null);
            }
          }}
        />

        <div className="mb-4 p-3 bg-zinc-950 border border-zinc-800 rounded text-sm text-gray-400">
          <p className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            All payment information is securely processed by Stripe. We never store your card details.
          </p>
        </div>
        {paymentElementError && <div className="mt-3 text-sm text-red-400">{paymentElementError}</div>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isStripeReady || isProcessing || isUpdatingFulfillment}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition text-base sm:text-lg flex items-center justify-center gap-2"
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

      {/* Legal Agreements */}
      <div className="text-sm text-gray-400 text-center">
        <p>
          By placing your order, you agree to our{" "}
          <Link href="/legal/terms" className="text-red-500 hover:text-red-400 underline">
            Terms of Service
          </Link>
          {" and "}
          <Link href="/legal/privacy" className="text-red-500 hover:text-red-400 underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}