// src/components/checkout/CheckoutForm.tsx
//
// PayRilla-based checkout form.
// Initializes HostedTokenization, collects the nonce, and POSTs to /api/checkout/create-checkout.

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Loader2, Lock, Package, TruckIcon, Mail } from "lucide-react";
import Link from "next/link";

import type { CartItem } from "@/types/domain/cart";
import type { HostedTokenizationInstance } from "@/types/domain/payrilla";
import { normalizeCountryCode, normalizeUsStateCode } from "@/lib/address/codes";
import { clientEnv } from "@/config/client-env";
import { getIdempotencyKeyFromStorage } from "@/lib/checkout/idempotency";

import { SavedAddresses } from "./SavedAddresses";
import { BillingAddressForm, type BillingAddress } from "./BillingAddressForm";

const GUEST_ORDER_ID_STORAGE_KEY = "rdk_guest_order_id";
const GUEST_ORDER_TOKEN_STORAGE_KEY = "rdk_guest_order_token";

interface CheckoutFormProps {
  orderId: string;
  tokenizationKey: string | null;
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

/** Read the NoFraud device fingerprint cookie set by the JS snippet. */
function getNoFraudToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  // NoFraud's script may use different cookie names depending on integration version
  const candidates = ["nf-token", "nf_token", "nfToken"];
  for (const cookie of document.cookie.split(";")) {
    const [k, v] = cookie.trim().split("=");
    if (candidates.includes(k.trim()) && v) {
      return decodeURIComponent(v.trim());
    }
  }
  return null;
}

export function CheckoutForm({
  orderId,
  tokenizationKey,
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

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPayrillaReady, setIsPayrillaReady] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [uiValidationErrors, setUiValidationErrors] = useState<string[]>([]);
  const [uiSubmitError, setUiSubmitError] = useState<string | null>(null);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [billingAddress, setBillingAddress] = useState<BillingAddress | null>(null);

  const emailSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hostedTokenizationRef = useRef<HostedTokenizationInstance | null>(null);

  // Auto-save guest email to database
  useEffect(() => {
    if (!isGuestCheckout || !guestEmail || !orderId) {
      return;
    }

    const trimmed = guestEmail.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      return;
    }

    if (emailSaveTimerRef.current) {
      clearTimeout(emailSaveTimerRef.current);
    }

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

  // Initialize PayRilla HostedTokenization once the script is loaded and key is available
  useEffect(() => {
    if (!isScriptLoaded || !tokenizationKey) {
      return;
    }

    const HT = window.HostedTokenization;
    if (!HT) {
      return;
    }

    // Destroy any previous instance before re-initializing
    hostedTokenizationRef.current?.destroy();
    hostedTokenizationRef.current = null;

    const instance = new HT(tokenizationKey, {
      target: "#payrilla-card-form",
      showZip: true,
      styles: {
        container: "background: transparent; padding: 0;",
        card: "background: #09090b; color: #ffffff; border: 1px solid #3f3f46; border-radius: 4px; padding: 8px 12px; font-size: 14px;",
        cvv2: "background: #09090b; color: #ffffff; border: 1px solid #3f3f46; border-radius: 4px; padding: 8px 12px; font-size: 14px;",
        avsZip:
          "background: #09090b; color: #ffffff; border: 1px solid #3f3f46; border-radius: 4px; padding: 8px 12px; font-size: 14px;",
      },
    });

    instance.on("ready", () => {
      setIsPayrillaReady(true);
    });

    hostedTokenizationRef.current = instance;

    return () => {
      hostedTokenizationRef.current?.destroy();
      hostedTokenizationRef.current = null;
      setIsPayrillaReady(false);
    };
  }, [isScriptLoaded, tokenizationKey]);

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
    if (!hostedTokenizationRef.current || !isPayrillaReady) {
      errors.push("Payment form is still loading");
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      return;
    }
    setEmailError(null);

    const ht = hostedTokenizationRef.current;
    if (!ht) {
      setUiSubmitError("Payment form not ready. Please refresh and try again.");
      return;
    }

    setIsProcessing(true);
    try {
      // Step 1: Get nonce from PayRilla iframe
      let nonceResult;
      try {
        nonceResult = await ht.getNonceToken();
      } catch (err) {
        throw new Error(
          err instanceof Error && err.message
            ? err.message
            : "Please check your card details and try again.",
        );
      }

      // Step 2: Read NoFraud device token (best-effort)
      const nfToken = getNoFraudToken();

      // Step 3: Submit to backend
      const payload = {
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        fulfillment,
        idempotencyKey: getIdempotencyKeyFromStorage() ?? crypto.randomUUID(),
        guestEmail: isGuestCheckout ? guestEmail : undefined,
        shippingAddress: fulfillment === "ship" ? toApiAddress(shippingAddress) : null,
        billingAddress: billingAddress ? toApiAddress(billingAddress) : null,
        nonce: nonceResult.nonce,
        expiryMonth: nonceResult.expiryMonth,
        expiryYear: nonceResult.expiryYear,
        avsZip: nonceResult.avsZip || billingAddress?.postal_code || null,
        cardholderName: billingAddress?.name || null,
        nfToken: nfToken ?? null,
      };

      const res = await fetch("/api/checkout/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.code === "CARD_DECLINED"
            ? "Your card was declined. Please try a different payment method."
            : data?.code === "FRAUD_BLOCKED"
              ? "We were unable to process your order. Please contact support."
              : data?.error || "Payment failed. Please try again.";
        throw new Error(msg);
      }

      // Success — store guest tokens and navigate
      const guestAccessToken =
        typeof data?.guestAccessToken === "string" && data.guestAccessToken.trim()
          ? data.guestAccessToken
          : null;

      if (isGuestCheckout && guestAccessToken) {
        try {
          sessionStorage.setItem(GUEST_ORDER_ID_STORAGE_KEY, data.orderId);
          sessionStorage.setItem(GUEST_ORDER_TOKEN_STORAGE_KEY, guestAccessToken);
        } catch {
          // sessionStorage may be unavailable
        }
      }

      const tokenParam = guestAccessToken
        ? `&token=${encodeURIComponent(guestAccessToken)}`
        : "";
      router.push(
        `/checkout/success?orderId=${data.orderId}&fulfillment=${fulfillment}${tokenParam}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed.";
      setUiSubmitError(msg);
      setUiValidationErrors([]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* PayRilla Hosted Tokenization script */}
      <Script
        src={clientEnv.NEXT_PUBLIC_PAYRILLA_TOKENIZATION_URL}
        strategy="afterInteractive"
        onLoad={() => setIsScriptLoaded(true)}
      />

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
                <p className="text-sm text-gray-400 mt-1">
                  Free — pick up at our location
                </p>
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
                <Link
                  href="/refunds"
                  className="text-red-500 hover:text-red-400 underline"
                >
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

          {/* PayRilla iframe target */}
          <div
            id="payrilla-card-form"
            className="min-h-[120px] rounded border border-zinc-800 bg-zinc-950/40 p-2"
          />

          {!isPayrillaReady && (
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading payment form...</span>
            </div>
          )}

          <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800 rounded text-sm text-gray-400">
            <p className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Your card details are securely processed. We never store raw card data.
            </p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isProcessing || isUpdatingFulfillment || !isPayrillaReady}
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
            <Link
              href="/legal/terms"
              className="text-red-500 hover:text-red-400 underline"
            >
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
    </>
  );
}
