"use client";

import { Loader2, Mail } from "lucide-react";

interface CheckoutGuestContactSectionProps {
  guestEmail: string;
  emailError: string | null;
  isProcessing: boolean;
  isSavingEmail: boolean;
  onGuestEmailChange?: (email: string) => void;
}

export function CheckoutGuestContactSection({
  guestEmail,
  emailError,
  isProcessing,
  isSavingEmail,
  onGuestEmailChange,
}: CheckoutGuestContactSectionProps) {
  return (
    <div className="border border-brand-border bg-brand-surface p-4 shadow-[0_20px_60px_rgba(17,17,17,0.06)] sm:p-6">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-brand-text sm:text-lg">
        <Mail className="w-4 h-4 sm:w-5 sm:h-5" /> Contact Information
      </h2>
      <div className="relative">
        <input
          type="email"
          value={guestEmail}
          onChange={(event) => onGuestEmailChange?.(event.target.value)}
          placeholder="you@email.com"
          className={`w-full border px-3 py-2 text-sm text-brand-text outline-none transition-colors placeholder:text-brand-muted sm:px-4 sm:py-3 sm:text-base ${emailError ? "border-red-400" : "border-brand-border"} bg-brand-surface focus:border-brand-text`}
          disabled={isProcessing}
        />
        {isSavingEmail && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-muted" />
          </div>
        )}
      </div>
      {emailError && <p className="mt-2 text-xs text-red-700 sm:text-sm">{emailError}</p>}
      <p className="mt-2 text-xs text-brand-muted">
        We&apos;ll send your order confirmation to this email.
      </p>
    </div>
  );
}
