"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, X } from "lucide-react";

export interface AddressSuggestion {
  line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface AddressSuggestionModalProps {
  isOpen: boolean;
  isValid: boolean;
  suggestions: AddressSuggestion[];
  originalAddress: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
  };
  onUseSuggestion: (suggestion: AddressSuggestion) => void;
  onUseOriginal: () => void;
  onCancel: () => void;
}

export function AddressSuggestionModal({
  isOpen,
  isValid,
  suggestions,
  originalAddress,
  onUseSuggestion,
  onUseOriginal,
  onCancel,
}: AddressSuggestionModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) {
    return null;
  }

  const suggestion = suggestions[0];

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex h-[100svh] w-screen items-center justify-center bg-brand-overlay p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto border border-brand-border bg-brand-surface shadow-[0_24px_80px_rgba(17,17,17,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-brand-border bg-brand-surface p-4">
          <div className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle className="h-5 w-5 text-brand-text" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-brand-text" />
            )}
            <h3 className="text-lg font-bold uppercase tracking-[0.08em] text-brand-text">
              {isValid ? "Address verified" : "Address suggestions"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-brand-muted transition-colors hover:text-brand-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="text-sm text-brand-muted">
            {isValid
              ? "We verified your address and found a standardized format."
              : "We could not verify the exact address you entered. Please review the suggested address below."}
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted">
              You entered
            </div>
            <div className="border border-brand-border bg-brand-page p-3 text-sm text-brand-text">
              {originalAddress.line1}
              <br />
              {originalAddress.city}, {originalAddress.state}{" "}
              {originalAddress.postal_code}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted">
              {isValid ? "Standardized format" : "Suggested address"}
            </div>
            <div className="border border-brand-text bg-brand-surface p-3 text-sm text-brand-text">
              {suggestion.line1}
              <br />
              {suggestion.city}, {suggestion.state} {suggestion.postal_code}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-brand-border bg-brand-surface p-4">
          <button
            type="button"
            onClick={() => onUseSuggestion(suggestion)}
            className="w-full border border-brand-text bg-brand-text px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-brand-surface transition-colors hover:bg-neutral-800"
          >
            Use standardized address
          </button>
          <button
            type="button"
            onClick={onUseOriginal}
            className="w-full border border-brand-border bg-brand-page px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-brand-text transition-colors hover:border-brand-text"
          >
            Use original address
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
