"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getIdempotencyKeyFromStorage } from "@/lib/checkout/idempotency";
import { normalizeCountryCode, normalizeUsStateCode } from "@/lib/address/codes";
import type { CartItem } from "@/types/domain/cart";

import { SavedAddresses } from "./SavedAddresses";
import { CheckoutFooterSection } from "./CheckoutFooterSection";
import { CheckoutFulfillmentSection } from "./CheckoutFulfillmentSection";
import { CheckoutGuestContactSection } from "./CheckoutGuestContactSection";
import { CheckoutPaymentSection } from "./CheckoutPaymentSection";

const GUEST_ORDER_ID_STORAGE_KEY = "rdk_guest_order_id";
const GUEST_ORDER_TOKEN_STORAGE_KEY = "rdk_guest_order_token";

interface CheckoutFormProps {
  orderId: string;
  items: CartItem[];
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

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function toApiAddress(address: AddressLike | null) {
  if (!address) {
    return null;
  }

  return {
    name: address.name,
    phone: address.phone ?? null,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    state: normalizeUsStateCode(address.state),
    postal_code: address.postal_code.trim(),
    country: normalizeCountryCode(address.country, "US"),
  };
}

export function CheckoutForm({
  orderId,
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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [uiValidationErrors, setUiValidationErrors] = useState<string[]>([]);
  const [uiSubmitError, setUiSubmitError] = useState<string | null>(null);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const emailSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

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
          const response = await fetch("/api/checkout/update-guest-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, guestEmail: trimmed }),
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
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
  }, [guestEmail, isGuestCheckout, orderId]);

  function getValidationErrors(): string[] {
    const errors: string[] = [];

    if (isGuestCheckout) {
      const email = guestEmail?.trim() || "";
      if (!email) {
        errors.push("Email address is required");
      } else if (!isValidEmail(email)) {
        errors.push("Email address is invalid");
      }
    }

    if (fulfillment === "ship" && !shippingAddress) {
      errors.push("Shipping address is required");
    } else if (fulfillment === "ship" && shippingAddress) {
      if (!shippingAddress.name?.trim()) {
        errors.push("Shipping name is required");
      }
      if (!shippingAddress.line1?.trim()) {
        errors.push("Shipping street address is required");
      }
      if (!shippingAddress.city?.trim()) {
        errors.push("Shipping city is required");
      }
      if (normalizeUsStateCode(shippingAddress.state).length !== 2) {
        errors.push("Shipping state must be a 2-letter code");
      }
      if (!shippingAddress.postal_code?.trim()) {
        errors.push("Shipping ZIP code is required");
      }
      if (normalizeCountryCode(shippingAddress.country, "US").length !== 2) {
        errors.push("Shipping country must be a 2-letter code");
      }
    }

    return errors;
  }

  async function submitCheckout() {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = getIdempotencyKeyFromStorage() ?? crypto.randomUUID();
    }

    const payload = {
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      fulfillment,
      idempotencyKey: idempotencyKeyRef.current,
      guestEmail: isGuestCheckout ? guestEmail : undefined,
      shippingAddress: fulfillment === "ship" ? toApiAddress(shippingAddress) : null,
    };

    const response = await fetch("/api/checkout/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        (data?.error as string | undefined) || "Unable to submit your order.",
      );
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    const validationErrors = getValidationErrors();
    setUiValidationErrors(validationErrors);
    setUiSubmitError(null);

    if (validationErrors.length > 0) {
      if (isGuestCheckout) {
        const email = guestEmail?.trim() || "";
        setEmailError(
          !email
            ? "Please enter your email address"
            : !isValidEmail(email)
              ? "Please enter a valid email"
              : null,
        );
      }
      return;
    }

    setEmailError(null);
    setIsProcessing(true);
    try {
      await submitCheckout();
    } catch (error: unknown) {
      setUiSubmitError(
        error instanceof Error ? error.message : "Unable to submit your order.",
      );
      setUiValidationErrors([]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void handleSubmit(event);
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

      {fulfillment === "ship" && (
        <SavedAddresses
          onSelectAddress={(address) => onShippingAddressChange(address)}
          selectedAddressId={selectedAddressId}
          onSelectAddressId={setSelectedAddressId}
          isGuest={isGuestCheckout}
        />
      )}

      <CheckoutPaymentSection />

      <CheckoutFooterSection
        displayTotal={displayTotal}
        isProcessing={isProcessing}
        isUpdatingFulfillment={isUpdatingFulfillment}
        hasAttemptedSubmit={hasAttemptedSubmit}
        uiSubmitError={uiSubmitError}
        uiValidationErrors={uiValidationErrors}
      />
    </form>
  );
}
