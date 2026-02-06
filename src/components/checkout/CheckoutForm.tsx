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
import type {
  StripeExpressCheckoutElementClickEvent,
  StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js";
import { Loader2, Lock, Package, TruckIcon, Mail } from "lucide-react";
import Link from "next/link";

import type { CartItem } from "@/types/domain/cart";

import { SavedAddresses } from "./SavedAddresses";

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
  guestEmail?: string | null;
  onGuestEmailChange?: (email: string) => void;
  isGuestCheckout?: boolean;
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

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

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
  guestEmail,
  onGuestEmailChange,
  isGuestCheckout = false,
}: CheckoutFormProps) {
  const router = useRouter();

  // Only call Stripe hooks when we're actually wrapped in Elements
  // This prevents errors when rendering the form before payment intent is created
  let stripe = null;
  let elements = null;
  try {
    stripe = useStripe();
    elements = useElements();
  } catch {
    // Not wrapped in Elements provider yet - this is expected for guest checkout
    // before email is entered
  }

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentElementError, setPaymentElementError] = useState<string | null>(null);

  // Inline email error (only updated on submit attempts)
  const [emailError, setEmailError] = useState<string | null>(null);

  // Submit gating
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Frozen (submit-time) user-facing errors under the button
  const [uiValidationErrors, setUiValidationErrors] = useState<string[]>([]);
  const [uiSubmitError, setUiSubmitError] = useState<string | null>(null);

  // For guest checkout, Stripe might not be ready yet
  const hasStripeElements = Boolean(elements);

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
        shippingAddress:
          fulfillment === "ship" ? toApiShippingAddress(shippingAddress) : null,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok && !data?.processing) {
      throw new Error(data.error || "Failed to confirm payment");
    }
  };

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];

    // Check guest email
    if (isGuestCheckout) {
      const trimmedEmail = guestEmail?.trim() || "";
      if (!trimmedEmail) {
        errors.push("Email address is required");
      } else if (!isValidEmail(trimmedEmail)) {
        errors.push("Email address is invalid");
      }
    }

    // Check shipping address for ship fulfillment
    if (fulfillment === "ship" && !shippingAddress) {
      errors.push("Shipping address is required");
    }

    // Check payment info
    if (!stripe || !elements) {
      errors.push("Payment system is still loading");
    } else if (!paymentComplete) {
      errors.push("Payment information is required");
    }

    return errors;
  };

  const handlePayment = async (withSubmit: boolean) => {
    setHasAttemptedSubmit(true);

    const validationErrors = getValidationErrors();

    // Freeze what the user sees under the button (ONLY updated on submit attempt)
    setUiValidationErrors(validationErrors);
    setUiSubmitError(null);

    if (validationErrors.length > 0) {
      // Only set inline email error on submit (NOT onChange)
      if (isGuestCheckout) {
        const trimmedEmail = guestEmail?.trim() || "";
        if (!trimmedEmail) {
          setEmailError("Please enter your email address");
        } else if (!isValidEmail(trimmedEmail)) {
          setEmailError("Please enter a valid email address");
        } else {
          setEmailError(null);
        }
      }

      return { ok: false, error: validationErrors[0] };
    }

    // Clear inline email error once validation passes
    setEmailError(null);

    if (!stripe || !elements) {
      // Freeze runtime error under button (ONLY updated on submit attempt)
      setUiSubmitError("Stripe is still loading. Please wait a moment.");
      setUiValidationErrors([]);
      return { ok: false, error: "Stripe not ready" };
    }

    setIsProcessing(true);

    try {
      if (withSubmit) {
        const { error: submitErrorLocal } = await elements.submit();
        if (submitErrorLocal) {
          throw new Error(submitErrorLocal.message);
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

      if (
        paymentIntent.status === "processing" ||
        paymentIntent.status === "requires_action"
      ) {
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
    } catch (err: unknown) {
      console.error("Payment error:", err);
      const message =
        err instanceof Error ? err.message : "Payment failed. Please try again.";

      // Freeze runtime error under the button (ONLY updated on submit attempt)
      setUiSubmitError(message);
      setUiValidationErrors([]);

      return { ok: false, error: message };
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handlePayment(true);
  };

  const handleExpressConfirm = async (
    event: StripeExpressCheckoutElementConfirmEvent,
  ) => {
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

  const handleExpressClick = (event: StripeExpressCheckoutElementClickEvent) => {
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
    // Do NOT clear/update UI errors here (errors update only on submit click)
  };

  const handleGuestEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onGuestEmailChange?.(e.target.value);
    // Do NOT clear/update UI errors here (errors update only on submit click)
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="space-y-6"
    >
      {/* Guest Email */}
      {isGuestCheckout && (
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-4 sm:p-6">
          <h2 className="text-sm sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
            Contact Information
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <input
              id="guest-email"
              type="email"
              value={guestEmail || ""}
              onChange={handleGuestEmailChange}
              placeholder="you@email.com"
              className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded bg-zinc-950 border ${
                emailError ? "border-red-500" : "border-zinc-800"
              } text-white focus:outline-none focus:ring-2 focus:ring-red-600`}
              disabled={isProcessing}
            />
            {emailError && (
              <p className="text-xs sm:text-sm text-red-400">{emailError}</p>
            )}
            <p className="text-xs text-zinc-500">
              We'll send your order confirmation and updates to this email.
            </p>
          </div>
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
              After purchase, you will receive a pickup email you can reply to for
              scheduling.
            </p>
            <p>
              You can also DM us on{" "}
              <a
                href="https://instagram.com/realdealkickzsc"
                className="text-red-400 hover:text-red-300"
                target="_blank"
                rel="noreferrer"
              >
                Instagram @realdealkickzsc
              </a>
              .
            </p>
            {canUseChat && (
              <p>Signed-in customers can also use the in-app pickup chat.</p>
            )}

            <div className="mt-3 pt-3 border-t border-zinc-800">
              <p className="font-medium text-white mb-2">Returns &amp; Refunds</p>
              <p>
                All sales are final except as outlined in our Returns &amp; Refunds
                policy.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                <Link
                  href="/refunds"
                  className="text-red-500 hover:text-red-400 underline"
                >
                  Returns &amp; Refunds Policy
                </Link>
              </div>
            </div>
          </div>
        )}

        {fulfillment === "ship" && (
          <div className="mt-4 border border-zinc-800/70 bg-zinc-950/40 rounded p-4 text-sm text-gray-400 space-y-2">
            <p className="font-medium text-white mb-2">Shipping Information</p>
            <p>We aim to ship within 24 hours (processing time, not delivery time).</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
              <Link
                href="/shipping"
                className="text-red-500 hover:text-red-400 underline"
              >
                Shipping Policy
              </Link>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-800">
              <p className="font-medium text-white mb-2">Returns &amp; Refunds</p>
              <p>
                All sales are final except as outlined in our Returns &amp; Refunds
                policy.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                <Link
                  href="/refunds"
                  className="text-red-500 hover:text-red-400 underline"
                >
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

        {hasStripeElements ? (
          <>
            <div className="mb-4">
              <ExpressCheckoutElement
                options={{
                  layout: {
                    overflow: "never",
                  },
                }}
                onConfirm={(event) => {
                  void handleExpressConfirm(event);
                }}
                onClick={handleExpressClick}
              />
            </div>

            <div className="text-xs uppercase tracking-widest text-center text-gray-500 mb-4">
              Or pay with card
            </div>

            <PaymentElement
              onChange={(event) => {
                setPaymentComplete(event.complete);
                // Do NOT clear/update ui errors here (errors update only on submit click)
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
                All payment information is securely processed by Stripe. We never store
                your card details.
              </p>
            </div>

            {paymentElementError && (
              <div className="mt-3 text-sm text-red-400">{paymentElementError}</div>
            )}
          </>
        ) : (
          <div className="p-8 text-center border border-zinc-800 rounded bg-zinc-950/40">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-red-600" />
            <p className="text-gray-400 text-sm">Loading payment options...</p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isProcessing || isUpdatingFulfillment}
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

      {/* Error Summary - single source of truth; only updates on submit click */}
      {(() => {
        if (!hasAttemptedSubmit) {
          return null;
        }

        const showSummary = uiSubmitError || uiValidationErrors.length > 0;
        if (!showSummary) {
          return null;
        }

        return (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-400 mb-2">
                  Please complete the following to place your order:
                </h3>
                <ul className="space-y-1.5 text-sm text-red-300">
                  {uiSubmitError && (
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{uiSubmitError}</span>
                    </li>
                  )}
                  {uiValidationErrors.map((msg, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{msg}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Legal Agreements */}
      <div className="text-sm text-gray-400 text-center">
        <p>
          By placing your order, you agree to our{" "}
          <Link href="/legal/terms" className="text-red-500 hover:text-red-400 underline">
            Terms of Service
          </Link>
          {" and "}
          <Link
            href="/legal/privacy"
            className="text-red-500 hover:text-red-400 underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
