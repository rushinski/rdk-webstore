// src/components/checkout/ShippingAddressModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, MapPin } from "lucide-react";

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

    // Validate address with HERE Maps
    setIsValidating(true);
    setSaveError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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

        // If there are suggestions, show the modal
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
      // Continue with save even if validation fails
    }

    setIsValidating(false);

    // No suggestions or validation failed just save
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
      className={[
        // Full-screen overlay (no blur/gradient)
        "fixed top-0 left-0 right-0 bottom-0 w-screen",
        "h-[100svh] supports-[height:100dvh]:h-[100dvh]",
        "z-[100]",
        "bg-black/70",
        // Bottom sheet on mobile, centered on desktop
        "flex items-end sm:items-center justify-center",
      ].join(" ")}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className={[
          "relative bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col",
          // MOBILE: flush left/right/bottom, with a small top gap
          "w-full mx-0 mb-0 mt-10",
          "rounded-t-2xl rounded-b-none",
          "max-h-[calc(100svh-2.5rem)] supports-[height:100dvh]:max-h-[calc(100dvh-2.5rem)]",
          // DESKTOP
          "sm:mx-4 sm:mt-0 sm:mb-0 sm:rounded-lg sm:max-w-lg sm:max-h-[90dvh]",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {initialAddress ? "Edit Shipping Address" : "Add Shipping Address"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div
          className={[
            "flex-1 min-h-0 overflow-y-auto p-4",
            // Hide scrollbar but keep scrolling
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          ].join(" ")}
        >
          <AddressInput
            value={{ ...address, line2: address.line2 ?? "" }}
            onChange={setAddress}
            requirePhone={false}
            requireEmail={false}
            showErrors={showErrors}
            countryCode="US"
          />

          {saveError && <div className="text-sm text-red-400 mt-4">{saveError}</div>}
        </div>

        {/* Footer */}
        <div
          className={[
            "flex-shrink-0 bg-zinc-900 border-t border-zinc-800 p-4",
            "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end",
            // Keep it tight, but safe-area aware
            "pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 border border-zinc-700 text-zinc-300 text-[16px] sm:text-sm rounded hover:border-zinc-500 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={isValidating}
            className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-[16px] sm:text-sm font-semibold rounded transition"
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
