"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CreditCard, X } from "lucide-react";

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
            <CreditCard className="h-5 w-5" />
            {initialAddress ? "Edit Billing Address" : "Add Billing Address"}
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
            onClick={handleSave}
            className="w-full border border-brand-text bg-brand-text px-6 py-2.5 text-[16px] font-semibold uppercase tracking-[0.08em] text-brand-surface transition-colors hover:bg-neutral-800 sm:w-auto sm:text-sm"
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
    country: "US",
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
