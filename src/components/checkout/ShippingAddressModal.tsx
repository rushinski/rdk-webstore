"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin, X } from "lucide-react";

import { AddressInput } from "@/components/shared/AddressInput";
import { AddressSuggestionModal } from "@/components/shared/AddressSuggestionModal";
import type { AddressSuggestion } from "@/components/shared/AddressSuggestionModal";
import { normalizeCountryCode, normalizeUsStateCode } from "@/lib/address/codes";

import type { ShippingAddress } from "./CheckoutForm";

interface ShippingAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: ShippingAddress) => void;
  initialAddress?: ShippingAddress | null;
}

export function ShippingAddressModal({
  isOpen,
  onClose,
  onSave,
  initialAddress,
}: ShippingAddressModalProps) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>(
    initialAddress || createEmptyAddress(),
  );
  const [isValidating, setIsValidating] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    suggestions: AddressSuggestion[];
  } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      setAddress(initialAddress || createEmptyAddress());
      setSaveError(null);
      setShowErrors(false);
      setShowSuggestionModal(false);
      setValidationResult(null);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialAddress]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    setShowErrors(true);
    const normalized = normalizeAddress(address);

    if (!isValidAddress(normalized)) {
      setSaveError("Please complete all required fields.");
      return;
    }

    setIsValidating(true);
    setSaveError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/maps/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line1: normalized.line1,
          city: normalized.city,
          state: normalized.state,
          postal_code: normalized.postal_code,
          country: normalized.country,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();

        if (result.suggestions && result.suggestions.length > 0) {
          setValidationResult({
            isValid: result.isValid,
            suggestions: result.suggestions,
          });
          setShowSuggestionModal(true);
          setIsValidating(false);
          return;
        }
      }
    } catch (error) {
      console.error("Validation error:", error);
    }

    setIsValidating(false);
    onSave(normalized);
    onClose();
  };

  const handleUseSuggestion = (suggestion: AddressSuggestion) => {
    const updatedAddress: ShippingAddress = {
      ...address,
      line1: suggestion.line1,
      city: suggestion.city,
      state: normalizeUsStateCode(suggestion.state, address.state),
      postal_code: suggestion.postal_code,
      country: normalizeCountryCode(suggestion.country, address.country || "US"),
    };
    onSave(normalizeAddress(updatedAddress));
    onClose();
  };

  const handleUseOriginal = () => {
    onSave(normalizeAddress(address));
    onClose();
  };

  const handleCancelSuggestion = () => {
    setShowSuggestionModal(false);
    setValidationResult(null);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!mounted || !isOpen) {
    return null;
  }

  const shippingModal = (
    <div
      className="fixed inset-0 z-[100] flex h-[100svh] w-screen items-end justify-center bg-brand-overlay sm:items-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="relative mt-10 flex max-h-[calc(100svh-2.5rem)] w-full flex-col border border-brand-border bg-brand-surface shadow-[0_24px_80px_rgba(17,17,17,0.18)] sm:m-4 sm:mt-0 sm:max-h-[90dvh] sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-brand-border bg-brand-surface p-4">
          <h2 className="flex items-center gap-2 text-base font-bold uppercase tracking-[0.08em] text-brand-text sm:text-lg">
            <MapPin className="h-5 w-5" />
            {initialAddress ? "Edit Shipping Address" : "Add Shipping Address"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-brand-muted transition hover:text-brand-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <AddressInput
            value={{ ...address, line2: address.line2 ?? "" }}
            onChange={setAddress}
            requirePhone={false}
            requireEmail={false}
            showErrors={showErrors}
            countryCode="US"
          />

          {saveError && <div className="mt-4 text-sm text-red-700">{saveError}</div>}
        </div>

        <div className="flex flex-shrink-0 flex-col items-stretch gap-3 border-t border-brand-border bg-brand-surface p-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full border border-brand-border bg-brand-page px-4 py-2.5 text-[16px] font-semibold uppercase tracking-[0.08em] text-brand-text transition-colors hover:border-brand-text sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={isValidating}
            className="w-full border border-brand-text bg-brand-text px-6 py-2.5 text-[16px] font-semibold uppercase tracking-[0.08em] text-brand-surface transition-colors hover:bg-neutral-800 disabled:border-neutral-400 disabled:bg-neutral-400 sm:w-auto sm:text-sm"
          >
            {isValidating ? "Validating..." : "Save Address"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(shippingModal, document.body)}
      {validationResult && (
        <AddressSuggestionModal
          isOpen={showSuggestionModal}
          isValid={validationResult.isValid}
          suggestions={validationResult.suggestions}
          originalAddress={{
            line1: address.line1,
            city: address.city,
            state: address.state,
            postal_code: address.postal_code,
          }}
          onUseSuggestion={handleUseSuggestion}
          onUseOriginal={handleUseOriginal}
          onCancel={handleCancelSuggestion}
        />
      )}
    </>
  );
}

function createEmptyAddress(): ShippingAddress {
  return {
    name: "",
    phone: "",
    email: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
  };
}

function normalizeAddress(address: ShippingAddress): ShippingAddress {
  return {
    name: address.name.trim(),
    phone: address.phone.trim(),
    email: address.email?.trim() || undefined,
    line1: address.line1.trim(),
    line2: address.line2?.trim() ?? "",
    city: address.city.trim(),
    state: normalizeUsStateCode(address.state),
    postal_code: address.postal_code.trim(),
    country: normalizeCountryCode(address.country, "US"),
  };
}

function isValidAddress(address: ShippingAddress): boolean {
  return (
    address.name.trim() !== "" &&
    address.line1.trim() !== "" &&
    address.city.trim() !== "" &&
    address.state.trim().length === 2 &&
    address.postal_code.trim() !== "" &&
    address.country.trim().length === 2
  );
}
