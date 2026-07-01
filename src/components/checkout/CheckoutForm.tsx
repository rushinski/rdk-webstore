// src/components/checkout/CheckoutForm.tsx
//
// PayRilla-based checkout form.
// Supports card payments via PayRilla HostedTokenization.

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

import type { CartItem } from "@/types/domain/cart";
import type { HostedTokenizationInstance } from "@/types/domain/payrilla";
import { normalizeCountryCode, normalizeUsStateCode } from "@/lib/address/codes";
import {
  getCardBrandIcon,
  getCardBrandLabel,
  normalizeCardTypeLabel,
  resolveCardBrand,
  type CardBrandId,
} from "@/lib/payments/card-brand";
import { clientEnv } from "@/config/client-env";
import { getIdempotencyKeyFromStorage } from "@/lib/checkout/idempotency";

import { SavedAddresses } from "./SavedAddresses";
import { BillingAddressForm, type BillingAddress } from "./BillingAddressForm";
import { CheckoutFooterSection } from "./CheckoutFooterSection";
import { CheckoutFulfillmentSection } from "./CheckoutFulfillmentSection";
import { CheckoutGuestContactSection } from "./CheckoutGuestContactSection";
import { CheckoutPaymentSection } from "./CheckoutPaymentSection";

const GUEST_ORDER_ID_STORAGE_KEY = "rdk_guest_order_id";
const GUEST_ORDER_TOKEN_STORAGE_KEY = "rdk_guest_order_token";

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

  expiryMonth: [PAYRILLA_BASE_FIELD_STYLE, "width: 76px", "text-align: center"].join(
    "; ",
  ),
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
  displayTotal: number;
  fulfillment: "ship" | "pickup";
  shippingAddress: ShippingAddress | null;
  onShippingAddressChange: (address: ShippingAddress | null) => void;
  onFulfillmentChange: (fulfillment: "ship" | "pickup") => void;
  isUpdatingFulfillment?: boolean;
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
  displayTotal,
  fulfillment,
  shippingAddress,
  onShippingAddressChange,
  onFulfillmentChange,
  isUpdatingFulfillment = false,
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
  const [cardBrand, setCardBrand] = useState<CardBrandId>("unknown");
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
  const idempotencyKeyRef = useRef<string | null>(null);

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
        setCardBrand(
          resolveCardBrand({
            cardType: event.result?.cardType ?? null,
            maskedCard: event.result?.maskedCard ?? null,
          }),
        );
      })
      .on("input", (event) => {
        setHasTouchedPayrilla(true);
        if (!event.error) {
          setPayrillaFieldError(null);
        }
        setCardBrand(
          resolveCardBrand({
            cardType: event.result?.cardType ?? null,
            maskedCard: event.result?.maskedCard ?? null,
          }),
        );
      });

    hostedTokenizationRef.current = instance;

    return () => {
      safelyDestroyHostedTokenization(hostedTokenizationRef.current, el);
      hostedTokenizationRef.current = null;
      setIsPayrillaReady(false);
      setPayrillaLoadError(null);
      setCardBrand("unknown");
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
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = getIdempotencyKeyFromStorage() ?? crypto.randomUUID();
    }
    const payload = {
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      fulfillment,
      idempotencyKey: idempotencyKeyRef.current,
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

    const tokenQuery = guestAccessToken
      ? `&token=${encodeURIComponent(guestAccessToken)}`
      : "";
    router.push(
      `/checkout/success?orderId=${data.orderId as string}&fulfillment=${fulfillment}${tokenQuery}`,
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
        cardType: normalizeCardTypeLabel(nonceResult.cardType) || null,
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
        {isGuestCheckout && (
          <CheckoutGuestContactSection
            guestEmail={guestEmail || ""}
            emailError={emailError}
            isProcessing={isProcessing}
            isSavingEmail={isSavingEmail}
            onGuestEmailChange={onGuestEmailChange}
          />
        )}

        <CheckoutFulfillmentSection
          fulfillment={fulfillment}
          isUpdatingFulfillment={isUpdatingFulfillment}
          isProcessing={isProcessing}
          onFulfillmentChange={onFulfillmentChange}
        />

        {/* Shipping Address */}
        {fulfillment === "ship" && (
          <SavedAddresses
            onSelectAddress={(addr) => onShippingAddressChange(addr)}
            selectedAddressId={selectedAddressId}
            onSelectAddressId={setSelectedAddressId}
            isGuest={isGuestCheckout}
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
        <CheckoutPaymentSection
          cardFormRef={cardFormRef}
          cardBrandIcon={getCardBrandIcon(cardBrand)}
          cardBrandLabel={getCardBrandLabel(cardBrand) ?? "Credit card"}
          isPayrillaReady={isPayrillaReady}
          payrillaLoadError={payrillaLoadError}
          showFieldError={
            (hasTouchedPayrilla || hasAttemptedSubmit) && !!payrillaFieldError
          }
          payrillaFieldError={payrillaFieldError}
        />

        <CheckoutFooterSection
          displayTotal={displayTotal}
          isProcessing={isProcessing}
          isUpdatingFulfillment={isUpdatingFulfillment}
          isPayrillaReady={isPayrillaReady}
          payrillaLoadError={payrillaLoadError}
          hasAttemptedSubmit={hasAttemptedSubmit}
          uiSubmitError={uiSubmitError}
          uiValidationErrors={uiValidationErrors}
        />
      </form>
    </>
  );
}
