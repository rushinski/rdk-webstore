// src/components/checkout/BillingAddressModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CreditCard } from "lucide-react";

import { AddressInput } from "@/components/shared/AddressInput";
import { normalizeUsStateCode } from "@/lib/address/codes";

import type { BillingAddress } from "./BillingAddressForm";

interface BillingAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: BillingAddress) => void;
  initialAddress?: BillingAddress | null;
}

export function BillingAddressModal({
  isOpen,
  onClose,
  onSave,
  initialAddress,
}: BillingAddressModalProps) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [address, setAddress] = useState<BillingAddress>(
    initialAddress || createEmptyAddress(),
  );
  const modalRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      setAddress(initialAddress || createEmptyAddress());
      setSaveError(null);
      setShowErrors(false);
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

  const handleSave = () => {
    setShowErrors(true);
    const normalized = normalizeAddress(address);

    if (!isValidAddress(normalized)) {
      setSaveError("Please complete all required fields.");
      return;
    }

    setSaveError(null);
    onSave(normalized);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!mounted || !isOpen) {
    return null;
  }

  const billingModal = (
    <div
      className={[
        "fixed top-0 left-0 right-0 bottom-0 w-screen",
        "h-[100svh] supports-[height:100dvh]:h-[100dvh]",
        "z-[100]",
        "bg-black/70",
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
          "w-full mx-0 mb-0 mt-10",
          "rounded-t-2xl rounded-b-none",
          "max-h-[calc(100svh-2.5rem)] supports-[height:100dvh]:max-h-[calc(100dvh-2.5rem)]",
          "sm:mx-4 sm:mt-0 sm:mb-0 sm:rounded-lg sm:max-w-lg sm:max-h-[90dvh]",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {initialAddress ? "Edit Billing Address" : "Add Billing Address"}
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
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-[16px] sm:text-sm font-semibold rounded transition"
          >
            Save Address
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(billingModal, document.body);
}

function createEmptyAddress(): BillingAddress {
  return {
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "US",
  };
}

function normalizeAddress(address: BillingAddress): BillingAddress {
  return {
    name: address.name.trim(),
    phone: address.phone.trim(),
    line1: address.line1.trim(),
    line2: address.line2?.trim() ?? "",
    city: address.city.trim(),
    state: normalizeUsStateCode(address.state),
    postal_code: address.postal_code.trim(),
    country: "US", // Always US
  };
}

function isValidAddress(address: BillingAddress): boolean {
  return (
    address.name.trim() !== "" &&
    address.line1.trim() !== "" &&
    address.city.trim() !== "" &&
    address.state.trim().length === 2 &&
    address.postal_code.trim() !== ""
  );
}
