// src/components/checkout/CheckoutForm.tsx
//
// PayRilla-based checkout form.
// Supports card payments via PayRilla HostedTokenization.

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Loader2, Lock, Package, TruckIcon, Mail, CreditCard } from "lucide-react";
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

// Maps PayRilla's cardType string → SVG filename in /icons/cards/
const CARD_BRAND_ICON: Record<string, string> = {
  Visa: "visa",
  Mastercard: "mastercard",
  "American Express": "american-express",
  Discover: "discover",
};

const PAYRILLA_BASE_FIELD_STYLE = [
  "background: #26272b",
  "color: #f5f5f5",
  "border: 1px solid #313338",
  "border-radius: 0",
  "padding: 10px 12px",
  "font-size: 15px",
  "font-family: Arial, Helvetica, sans-serif",
  "line-height: 1.35",
  "box-sizing: border-box",
  "min-height: 44px",
  "width: 100%",
  "display: block",
].join("; ");

const PAYRILLA_HOSTED_STYLES: Record<string, string> = {
  container: [
    "background: transparent",
    "padding: 0",
    "max-width: 460px",
    "width: 100%",
  ].join("; "),
  card: [
    PAYRILLA_BASE_FIELD_STYLE,
    "width: 100%",
    "font-family: monospace",
    "letter-spacing: 1.2px",
    "margin-bottom: 16px",
  ].join("; "),
  expiryContainer: [
    "display: inline-flex",
    "gap: 12px",
    "align-items: end",
    "vertical-align: top",
  ].join("; "),
  
  expiryMonth: [PAYRILLA_BASE_FIELD_STYLE, "width: 76px", "text-align: center"].join("; "),
  expirySeparator: [
    "color: #9ca3af",
    "font-size: 16px",
    "display: inline-block",
    "vertical-align: top",
    "line-height: 44px",
    "margin: 0 2px",
  ].join("; "),
  expiryYear: [PAYRILLA_BASE_FIELD_STYLE, "width: 76px", "text-align: center"].join("; "),
  cvv2: [
    PAYRILLA_BASE_FIELD_STYLE,
    "width: 92px",
    "letter-spacing: 3px",
    "display: inline-block",
    "vertical-align: top",
    "margin-left: 12px",
  ].join("; "),
  labels: [
    "color: #e4e4e7",
    "font-size: 13px",
    "font-weight: 500",
    "margin: 0 0 8px 0",
    "display: block",
    "line-height: 1",
  ].join("; "),
  floatingLabelsPlaceholder: [
    "color: transparent",
    "font-size: 0",
    "line-height: 0",
    "opacity: 0",
  ].join("; "),
};

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

type AddressLike = {
  name: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function toApiAddress(addr: AddressLike | null) {
  if (!addr) {
    return null;
  }
  return {
    name: addr.name,
    phone: addr.phone ?? null,
    line1: addr.line1,
    line2: addr.line2 ?? null,
    city: addr.city,
    state: normalizeUsStateCode(addr.state),
    postal_code: addr.postal_code.trim(),
    country: normalizeCountryCode(addr.country, "US"),
  };
}

function getNoFraudToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const candidates = ["nf-token", "nf_token", "nfToken"];
  for (const cookie of document.cookie.split(";")) {
    const [k, v] = cookie.trim().split("=");
    if (candidates.includes(k.trim()) && v) {
      return decodeURIComponent(v.trim());
    }
  }
  return null;
}

function getPayrillaErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: unknown;
      error?: unknown;
      detail?: unknown;
    };

    for (const value of [candidate.message, candidate.error, candidate.detail]) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return "Please check your card details and try again.";
}

function safelyDestroyHostedTokenization(
  instance: HostedTokenizationInstance | null,
  container: HTMLDivElement | null,
) {
  if (!instance) {
    if (container) {
      container.innerHTML = "";
    }
    return;
  }

  try {
    instance.destroy();
  } catch (error) {
    console.warn("[PayRilla] destroy failed during cleanup:", error);
  } finally {
    if (container) {
      container.innerHTML = "";
    }
  }
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
  const [payrillaLoadError, setPayrillaLoadError] = useState<string | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(
    typeof window !== "undefined" && typeof window.HostedTokenization === "function",
  );
  const [cardType, setCardType] = useState<string | null>(null);
  const [payrillaFieldError, setPayrillaFieldError] = useState<string | null>(null);
  const [hasTouchedPayrilla, setHasTouchedPayrilla] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [uiValidationErrors, setUiValidationErrors] = useState<string[]>([]);
  const [uiSubmitError, setUiSubmitError] = useState<string | null>(null);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [billingAddress, setBillingAddress] = useState<BillingAddress | null>(null);

  const emailSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hostedTokenizationRef = useRef<HostedTokenizationInstance | null>(null);
  const cardFormRef = useRef<HTMLDivElement>(null);

  // Next Script can dedupe/load the SDK before this component's onLoad handler runs.
  // If the global is already present, treat the script as loaded so initialization can proceed.
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      typeof window.HostedTokenization === "function"
    ) {
      setIsScriptLoaded(true);
    }
  }, [tokenizationKey]);

  // Auto-save guest email to database (debounced)
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

  // Initialize PayRilla HostedTokenization once script + key are ready
  useEffect(() => {
    if (!isScriptLoaded || !tokenizationKey) {
      return;
    }

    const el = cardFormRef.current;
    if (!el) {
      return;
    }

    const HT = window.HostedTokenization;
    if (!HT) {
      console.error(
        "[PayRilla] window.HostedTokenization undefined — script may have failed to load:",
        clientEnv.NEXT_PUBLIC_PAYRILLA_TOKENIZATION_URL,
      );
      setPayrillaLoadError("Payment form failed to load. Please refresh.");
      return;
    }

    // Destroy any previous instance and clear the container.
    // PayRilla's SDK can throw during route changes if its internal node is already gone.
    safelyDestroyHostedTokenization(hostedTokenizationRef.current, el);
    hostedTokenizationRef.current = null;

    let instance: HostedTokenizationInstance;
    try {
      instance = new HT(tokenizationKey, {
        target: "#payrilla-card-form",
        showZip: false, // Billing address form already collects ZIP
        requireCvv2: true,
        labelType: "static-top",
        styles: PAYRILLA_HOSTED_STYLES,
      });
    } catch (err) {
      console.error("[PayRilla] constructor threw:", err);
      setPayrillaLoadError("Payment form failed to initialize. Please refresh.");
      return;
    }

    instance
      .on("ready", () => {
        setIsPayrillaReady(true);
        setPayrillaLoadError(null);
        setPayrillaFieldError(null);
      })
      .on("change", (event) => {
        setHasTouchedPayrilla(true);
        const errorMessage = getPayrillaErrorMessage(event.error);
        setPayrillaFieldError(errorMessage);
        const detected = event.result?.cardType;
        setCardType(detected && detected !== "" ? detected : null);
      })
      .on("input", (event) => {
        setHasTouchedPayrilla(true);
        if (!event.error) {
          setPayrillaFieldError(null);
        }
        const detected = event.result?.cardType;
        setCardType(detected && detected !== "" ? detected : null);
      });

    hostedTokenizationRef.current = instance;

    return () => {
      safelyDestroyHostedTokenization(hostedTokenizationRef.current, el);
      hostedTokenizationRef.current = null;
      setIsPayrillaReady(false);
      setPayrillaLoadError(null);
      setCardType(null);
      setPayrillaFieldError(null);
      setHasTouchedPayrilla(false);
    };
  }, [isScriptLoaded, tokenizationKey]);

  // Validate fields required for all payment methods (card + wallet)
  function validateCommonFields(): string[] {
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
    return errors;
  }

  // Full validation for card payment (includes billing address + card form)
  function getCardValidationErrors(): string[] {
    const errors = validateCommonFields();
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
  }

  // POST to /api/checkout/create-checkout with payment data merged in
  async function submitCheckout(paymentData: Record<string, unknown>) {
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
      nfToken: getNoFraudToken(),
      ...paymentData,
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
          : data?.code === "PAYMENT_DECLINED"
            ? "Payment was declined. Please try a different payment method."
            : data?.code === "FRAUD_BLOCKED"
              ? "We were unable to process your order. Please contact support."
              : (data?.error as string | undefined) ||
                "Payment failed. Please try again.";
      throw new Error(msg);
    }

    const guestAccessToken =
      typeof data?.guestAccessToken === "string" && data.guestAccessToken.trim()
        ? (data.guestAccessToken as string)
        : null;

    if (isGuestCheckout && guestAccessToken) {
      try {
        sessionStorage.setItem(GUEST_ORDER_ID_STORAGE_KEY, data.orderId as string);
        sessionStorage.setItem(GUEST_ORDER_TOKEN_STORAGE_KEY, guestAccessToken);
      } catch {
        // sessionStorage unavailable
      }
    }

    // Handle under_review status — order is on hold pending fraud review
    if ((data as { status?: string }).status === "under_review") {
      router.push(
        `/checkout/success?orderId=${data.orderId as string}&fulfillment=${fulfillment}&status=under_review`,
      );
      return;
    }

    const tokenParam = guestAccessToken
      ? `&token=${encodeURIComponent(guestAccessToken)}`
      : "";
    router.push(
      `/checkout/success?orderId=${data.orderId as string}&fulfillment=${fulfillment}${tokenParam}`,
    );
  }

  // Card payment form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    const validationErrors = getCardValidationErrors();
    setUiValidationErrors(validationErrors);
    setUiSubmitError(null);

    if (validationErrors.length > 0) {
      if (isGuestCheckout) {
        const em = guestEmail?.trim() || "";
        setEmailError(
          !em
            ? "Please enter your email address"
            : !isValidEmail(em)
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
      let nonceResult;
      try {
        nonceResult = await ht.getNonceToken();
      } catch (err) {
        const message =
          getPayrillaErrorMessage(err) ??
          payrillaFieldError ??
          "Please check your card details and try again.";
        setPayrillaFieldError(message);
        throw new Error(message);
      }

      await submitCheckout({
        nonce: nonceResult.nonce,
        expiryMonth: nonceResult.expiryMonth,
        expiryYear: nonceResult.expiryYear,
        avsZip: billingAddress?.postal_code || null,
        cardholderName: billingAddress?.name || null,
        last4: nonceResult.last4 || null,
        cardType: nonceResult.cardType || null,
        billingAddress: toApiAddress(billingAddress),
      });
    } catch (err: unknown) {
      setUiSubmitError(err instanceof Error ? err.message : "Payment failed.");
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
        onReady={() => setIsScriptLoaded(true)}
        onLoad={() => setIsScriptLoaded(true)}
        onError={() => {
          console.error(
            "[PayRilla] Script failed to load:",
            clientEnv.NEXT_PUBLIC_PAYRILLA_TOKENIZATION_URL,
          );
          setPayrillaLoadError("Payment form failed to load. Please refresh.");
        }}
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
              We&apos;ll send your order confirmation to this email.
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
              <p>After purchase, you&apos;ll receive a pickup email for scheduling.</p>
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

        {/* Billing Address (used for card payments; wallet provides its own) */}
        <BillingAddressForm
          billingAddress={billingAddress}
          onBillingAddressChange={setBillingAddress}
          shippingAddress={shippingAddress}
          fulfillment={fulfillment}
          isProcessing={isProcessing}
        />

        {/* Payment Method */}
        <div className="bg-zinc-900 border border-zinc-800/70 rounded-lg p-5 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Payment Method
          </h2>

          {/* Card iframe with brand icon and accepted cards note */}
          <div className="relative max-w-[460px]">
            <div
              id="payrilla-card-form"
              ref={cardFormRef}
              className="min-h-[120px]"
            />

            {/* Card brand icon — overlaid on the card number input row */}
            <div
              className="absolute right-3 flex items-center pointer-events-none"
              style={{ top: "4px", height: "44px", left: "480px" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/icons/cards/${cardType && CARD_BRAND_ICON[cardType] ? CARD_BRAND_ICON[cardType] : "default"}.svg`}
                alt={cardType && CARD_BRAND_ICON[cardType] ? cardType : "Credit card"}
                className="h-7 w-auto"
              />
            </div>
          </div>

          {/* Accepted cards */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-zinc-500">Accepted:</span>
            {["visa", "mastercard", "american-express", "discover"].map((brand) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={brand}
                src={`/icons/cards/${brand}.svg`}
                alt={brand}
                className="h-7 w-auto opacity-60"
              />
            ))}
          </div>

          {!isPayrillaReady && !payrillaLoadError && (
            <div className="flex items-center gap-2 text-sm text-zinc-400 mt-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading card form...</span>
            </div>
          )}

          {(hasTouchedPayrilla || hasAttemptedSubmit) && payrillaFieldError && (
            <p className="text-xs sm:text-sm text-red-400 mt-2">{payrillaFieldError}</p>
          )}

          {payrillaLoadError && (
            <p className="text-xs sm:text-sm text-red-400 mt-2">{payrillaLoadError}</p>
          )}

          {/* Secure badge */}
          <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
            <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-emerald-600 font-medium">
              Secure payment processing
            </span>
            <span className="text-zinc-600">·</span>
            <span>PCI compliant</span>
          </div>
        </div>

        {/* Card submit button */}
        <button
          type="submit"
          disabled={
            isProcessing ||
            isUpdatingFulfillment ||
            !isPayrillaReady ||
            !!payrillaLoadError
          }
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
