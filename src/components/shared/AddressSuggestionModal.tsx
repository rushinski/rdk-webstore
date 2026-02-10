"use client";

import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle, X } from "lucide-react";

export interface AddressSuggestion {
  line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface AddressSuggestionModalProps {
  isOpen: boolean;
  isValid: boolean; // true = verified with suggestions, false = invalid with alternatives
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
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) {
    return null;
  }

  const modal = (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 w-screen h-[100svh] z-[9999] bg-black/90 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 9999 }}
    >
      <div
        className="relative bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000 }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            )}
            <h3 className="text-lg font-semibold text-white">
              {isValid ? "Address Verified" : "Address Suggestions"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className={`text-sm ${isValid ? "text-white" : "text-yellow-300"}`}>
            {isValid
              ? "We verified your address and found a standardized format."
              : "We couldn't verify the exact address you entered. Please review the suggestion below."}
          </div>

          {/* Original Address */}
          <div>
            <div className="text-xs font-medium text-gray-400 mb-1">You entered:</div>
            <div className="text-sm text-gray-300 bg-zinc-950 border border-zinc-800 rounded p-3">
              {originalAddress.line1}
              <br />
              {originalAddress.city}, {originalAddress.state} {originalAddress.postal_code}
            </div>
          </div>

          {/* Suggested Address */}
          <div>
            <div className="text-xs font-medium text-gray-400 mb-1">
              {isValid ? "Standardized format:" : "Suggested address:"}
            </div>
            <div className="text-sm text-white bg-zinc-950 border border-red-600/50 rounded p-3">
              {suggestions[0].line1}
              <br />
              {suggestions[0].city}, {suggestions[0].state} {suggestions[0].postal_code}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onUseSuggestion(suggestions[0])}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition"
          >
            Use Standardized Address
          </button>
          <button
            type="button"
            onClick={onUseOriginal}
            className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded transition"
          >
            Use Original Address
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
