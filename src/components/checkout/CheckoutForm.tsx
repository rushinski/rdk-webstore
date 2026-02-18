// src/components/checkout/CheckoutForm.tsx

"use client";

import { useState, useEffect, useRef } from "react";
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
import { normalizeCountryCode, normalizeUsStateCode } from "@/lib/address/codes";

import { SavedAddresses } from "./SavedAddresses";
import { BillingAddressForm, type BillingAddress } from "./BillingAddressForm";

const GUEST_ORDER_ID_STORAGE_KEY = "rdk_guest_order_id";
const GUEST_ORDER_TOKEN_STORAGE_KEY = "rdk_guest_order_token";

interface CheckoutFormProps {
  orderId: string;
  stripeAccountId?: string;
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
  email?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

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

  let stripe = null;
  let elements = null;
  try {
    stripe = useStripe();
    elements = useElements();
  } catch {
    // Not wrapped in Elements yet
  }

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [uiValidationErrors, setUiValidationErrors] = useState<string[]>([]);
  const [uiSubmitError, setUiSubmitError] = useState<string | null>(null);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const emailSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [billingAddress, setBillingAddress] = useState<BillingAddress | null>(null);

  const hasStripeElements = Boolean(elements);

  // ✅ NEW: Auto-save guest email to database when it changes
  // This prevents race conditions where sessionStorage is cleared during Afterpay redirect
  useEffect(() => {
    if (!isGuestCheckout || !guestEmail || !orderId) {
      return;
    }

    const trimmed = guestEmail.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      return;
    }

    // Clear any pending save
    if (emailSaveTimerRef.current) {
      clearTimeout(emailSaveTimerRef.current);
    }

    // Debounce: save 500ms after user stops typing
    emailSaveTimerRef.current = setTimeout(() => {
      const saveEmail = async () => {
        setIsSavingEmail(true);
        try {
          const res = await fetch("/api/checkout/update-guest-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, guestEmail: trimmed }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            console.warn("[CheckoutForm] Failed to save guest email:", data.error);
          } else {
            console.info("[CheckoutForm] Guest email saved to database:", trimmed);
          }
        } catch (error) {
          console.error("[CheckoutForm] Error saving guest email:", error);
        } finally {
          setIsSavingEmail(false);
        }
      };

      void saveEmail();
    }, 500);

    return () => {
      if (emailSaveTimerRef.current) {
        clearTimeout(emailSaveTimerRef.current);
      }
    };
  }, [isGuestCheckout, guestEmail, orderId]);

  const toApiAddress = (addr: ShippingAddress | null) =>
    addr
      ? {
          name: addr.name,
          phone: addr.phone,
          line1: addr.line1,
          line2: addr.line2 ?? null,
          city: addr.city,
          state: normalizeUsStateCode(addr.state),
          postal_code: addr.postal_code.trim(),
          country: normalizeCountryCode(addr.country, "US"),
        }
      : null;

  const confirmBackend = async (paymentIntentId: string) => {
    // ✅ PASS guestEmail and billingAddress in the body
    const payload = {
      orderId,
      paymentIntentId,
      fulfillment,
      shippingAddress: fulfillment === "ship" ? toApiAddress(shippingAddress) : null,
      billingAddress: billingAddress ? toApiAddress(billingAddress) : null,
      guestEmail: isGuestCheckout ? guestEmail : undefined,
    };

    const res = await fetch("/api/checkout/confirm-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    const guestAccessToken =
      typeof data?.guestAccessToken === "string" && data.guestAccessToken.trim()
        ? data.guestAccessToken
        : null;

    if (isGuestCheckout && guestAccessToken) {
      try {
        sessionStorage.setItem(GUEST_ORDER_ID_STORAGE_KEY, orderId);
        sessionStorage.setItem(GUEST_ORDER_TOKEN_STORAGE_KEY, guestAccessToken);
      } catch {
        // sessionStorage may be unavailable
      }
    }

    if (data?.processing) {
      const tokenParam = guestAccessToken
        ? `&token=${encodeURIComponent(guestAccessToken)}`
        : "";
      router.push(
        `/checkout/success?orderId=${orderId}&fulfillment=${fulfillment}${tokenParam}`,
      );
      return { ...data, guestAccessToken };
    }
    if (!res.ok) {
      throw new Error(data.error || "Failed to confirm payment");
    }
    return { ...data, guestAccessToken };
  };

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (isGuestCheckout) {
      const e = guestEmail?.trim() || "";
      if (!e) {
        errors.push("Email address is required");
      } else if (!isValidEmail(e)) {
        errors.push("Email address is invalid");
      }
    }
    if (fulfillment === "ship" && !shippingAddress) {
      errors.push("Shipping address is required");
    } else if (fulfillment === "ship" && shippingAddress) {
      if (normalizeUsStateCode(shippingAddress.state).length !== 2) {
        errors.push("Shipping state must be a 2-letter code");
      }
      if (normalizeCountryCode(shippingAddress.country, "US").length !== 2) {
        errors.push("Shipping country must be a 2-letter code");
      }
    }
    // Billing address validation
    if (!billingAddress) {
      errors.push("Billing address is required");
    } else {
      if (!billingAddress.name?.trim()) {
        errors.push("Billing name is required");
      }
      if (!billingAddress.line1?.trim()) {
        errors.push("Billing street address is required");
      }
      if (!billingAddress.city?.trim()) {
        errors.push("Billing city is required");
      }
      if (normalizeUsStateCode(billingAddress.state).length !== 2) {
        errors.push("Billing state must be a 2-letter code");
      }
      if (!billingAddress.postal_code?.trim()) {
        errors.push("Billing ZIP code is required");
      }
      if (normalizeCountryCode(billingAddress.country, "US").length !== 2) {
        errors.push("Billing country must be a 2-letter code");
      }
    }
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
    setUiValidationErrors(validationErrors);
    setUiSubmitError(null);

    if (validationErrors.length > 0) {
      if (isGuestCheckout) {
        const e = guestEmail?.trim() || "";
        setEmailError(
          !e
            ? "Please enter your email address"
            : !isValidEmail(e)
              ? "Please enter a valid email"
              : null,
        );
      }
      return { ok: false, error: validationErrors[0] };
    }
    setEmailError(null);

    if (!stripe || !elements) {
      setUiSubmitError("Stripe is still loading.");
      return { ok: false, error: "Stripe not ready" };
    }

    setIsProcessing(true);
    try {
      if (withSubmit) {
        const { error: submitErr } = await elements.submit();
        if (submitErr) {
          throw new Error(submitErr.message);
        }
      }

      // Persist guest email before Stripe redirect (Affirm, Afterpay, Klarna)
      // so the processing page can recover it after the redirect round-trip.
      if (isGuestCheckout && guestEmail) {
        try {
          sessionStorage.setItem("checkout_guest_email", guestEmail);
        } catch {
          // sessionStorage may be unavailable; non-fatal
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
                    postal_code: shippingAddress.postal_code.trim(),
                    country: shippingAddress.country.trim().toUpperCase(),
                  },
                }
              : undefined,
          payment_method_data: billingAddress
            ? {
                billing_details: {
                  name: billingAddress.name,
                  email: guestEmail || undefined,
                  phone: billingAddress.phone || undefined,
                  address: {
                    line1: billingAddress.line1,
                    line2: billingAddress.line2 || undefined,
                    city: billingAddress.city,
                    state: billingAddress.state.trim().toUpperCase(),
                    postal_code: billingAddress.postal_code.trim(),
                    country: billingAddress.country.trim().toUpperCase(),
                  },
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
        const confirmData = await confirmBackend(paymentIntent.id);
        // confirmBackend may have already redirected for processing status
        if (!confirmData?.processing) {
          const tokenParam = confirmData?.guestAccessToken
            ? `&token=${encodeURIComponent(confirmData.guestAccessToken)}`
            : "";
          router.push(
            `/checkout/success?orderId=${orderId}&fulfillment=${fulfillment}${tokenParam}`,
          );
        }
        return { ok: true };
      }

      // BNPL "processing" — authorized but not yet settled. Normal!
      if (paymentIntent.status === "processing") {
        await confirmBackend(paymentIntent.id);
        return { ok: true };
      }

      if (paymentIntent.status === "requires_action") {
        let tokenParam = "";
        if (isGuestCheckout) {
          try {
            const storedOrderId = sessionStorage.getItem(GUEST_ORDER_ID_STORAGE_KEY);
            const storedToken = sessionStorage.getItem(GUEST_ORDER_TOKEN_STORAGE_KEY);
            if (storedOrderId === orderId && storedToken) {
              tokenParam = `&token=${encodeURIComponent(storedToken)}`;
            }
          } catch {
            // sessionStorage may be unavailable
          }
        }
        router.push(
          `/checkout/processing?orderId=${orderId}&payment_intent=${paymentIntent.id}&fulfillment=${fulfillment}${tokenParam}`,
        );
        return { ok: true };
      }

      throw new Error("Payment failed. Please try again.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed.";
      setUiSubmitError(msg);
      setUiValidationErrors([]);
      return { ok: false, error: msg };
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
      event.paymentFailed({ reason: "fail", message: "Please wait." });
      return;
    }
    const result = await handlePayment(false);
    if (!result.ok) {
      event.paymentFailed({ reason: "fail", message: result.error });
    }
  };

  const handleExpressClick = (event: StripeExpressCheckoutElementClickEvent) => {
    // Note: Express Checkout (Apple Pay/Google Pay) handles email internally
    // You might need to add `emailRequired: true` to ExpressCheckoutElement options
    // if you want to force it there, but for now we focus on the form inputs.
    const lineItems = items.map((i) => ({
      name: i.titleDisplay,
      amount: i.priceCents * i.quantity,
    }));
    const totalCents = Math.round(total * 100);
    const itemsCents = lineItems.reduce((s, i) => s + i.amount, 0);
    const shipCents = Math.max(totalCents - itemsCents, 0);
    if (fulfillment === "ship" && shipCents > 0) {
      lineItems.push({ name: "Shipping", amount: shipCents });
    }
    event.resolve({ lineItems });
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-6"
    >
      {/* Guest Email */}
      {isGuestCheckout && (
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-4 sm:p-6">
          <h2 className="text-sm sm:text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5" /> Contact Information
          </h2>
          <div className="relative">
            <input
              type="email"
              value={guestEmail || ""}
              onChange={(e) => onGuestEmailChange?.(e.target.value)}
              placeholder="you@email.com"
              className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded bg-zinc-950 border ${emailError ? "border-red-500" : "border-zinc-800"} text-white focus:outline-none focus:ring-2 focus:ring-red-600`}
              disabled={isProcessing}
            />
            {isSavingEmail && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
              </div>
            )}
          </div>
          {emailError && (
            <p className="text-xs sm:text-sm text-red-400 mt-2">{emailError}</p>
          )}
          <p className="text-xs text-zinc-500 mt-2">
            We'll send your order confirmation to this email.
          </p>
        </div>
      )}

      {/* Fulfillment Method */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" /> Delivery Method
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
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-4 h-4 text-gray-400" />
                <span className="text-white font-medium">Ship to me</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Standard shipping</p>
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
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                <span className="text-white font-medium">Local pickup</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Free — pick up at our location</p>
            </div>
          </label>
        </div>

        {fulfillment === "pickup" && (
          <div className="mt-4 border border-zinc-800/70 bg-zinc-950/40 rounded p-4 text-sm text-gray-400 space-y-2">
            <p className="font-medium text-white mb-2">Pickup Information</p>
            <p>After purchase, you'll receive a pickup email for scheduling.</p>
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
              <Link
                href="/refunds"
                className="text-red-500 hover:text-red-400 underline mt-2 inline-block"
              >
                Returns &amp; Refunds Policy
              </Link>
            </div>
          </div>
        )}

        {fulfillment === "ship" && (
          <div className="mt-4 border border-zinc-800/70 bg-zinc-950/40 rounded p-4 text-sm text-gray-400 space-y-2">
            <p className="font-medium text-white mb-2">Shipping Information</p>
            <p>We aim to ship within 24 hours (processing time, not delivery).</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
              <Link
                href="/shipping"
                className="text-red-500 hover:text-red-400 underline"
              >
                Shipping Policy
              </Link>
              <Link href="/refunds" className="text-red-500 hover:text-red-400 underline">
                Returns &amp; Refunds Policy
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Shipping Address */}
      {fulfillment === "ship" && (
        <SavedAddresses
          onSelectAddress={(addr) => onShippingAddressChange(addr)}
          selectedAddressId={selectedAddressId}
          onSelectAddressId={setSelectedAddressId}
          isGuest={!canUseChat}
        />
      )}

      {/* Billing Address */}
      <BillingAddressForm
        billingAddress={billingAddress}
        onBillingAddressChange={setBillingAddress}
        shippingAddress={shippingAddress}
        fulfillment={fulfillment}
        isProcessing={isProcessing}
      />

      {/* Payment */}
      <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" /> Payment Information
        </h2>

        {hasStripeElements ? (
          <>
            <div className="mb-4">
              <ExpressCheckoutElement
                options={{ layout: { overflow: "never" } }}
                onConfirm={(e) => {
                  void handleExpressConfirm(e);
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
              }}
            />

            <div className="mt-4 mb-4 p-3 bg-zinc-950 border border-zinc-800 rounded text-sm text-gray-400">
              <p className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                All payments are securely processed by Stripe. We never store your card
                details.
              </p>
            </div>
          </>
        ) : (
          <div className="p-8 text-center border border-zinc-800 rounded bg-zinc-950/40">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-red-600" />
            <p className="text-gray-400 text-sm">Loading payment options...</p>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isProcessing || isUpdatingFulfillment}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition text-base sm:text-lg flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Processing payment...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" /> Place Order — ${total.toFixed(2)}
          </>
        )}
      </button>

      {/* Error Summary */}
      {hasAttemptedSubmit && (uiSubmitError || uiValidationErrors.length > 0) && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-2">
            Please complete the following:
          </h3>
          <ul className="space-y-1.5 text-sm text-red-300">
            {uiSubmitError && (
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>{uiSubmitError}</span>
              </li>
            )}
            {uiValidationErrors.map((msg, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legal */}
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
