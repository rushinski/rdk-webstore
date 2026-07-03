"use client";

import { Loader2, Lock } from "lucide-react";
import Link from "next/link";

interface CheckoutFooterSectionProps {
  displayTotal: number;
  isProcessing: boolean;
  isUpdatingFulfillment: boolean;
  hasAttemptedSubmit: boolean;
  uiSubmitError: string | null;
  uiValidationErrors: string[];
}

export function CheckoutFooterSection({
  displayTotal,
  isProcessing,
  isUpdatingFulfillment,
  hasAttemptedSubmit,
  uiSubmitError,
  uiValidationErrors,
}: CheckoutFooterSectionProps) {
  return (
    <>
      <button
        type="submit"
        disabled={isProcessing || isUpdatingFulfillment}
        className="flex w-full items-center justify-center gap-2 border border-brand-text bg-brand-text px-4 py-4 text-base font-bold uppercase tracking-[0.08em] text-brand-page transition hover:bg-white disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-border disabled:text-brand-muted sm:text-lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Submitting order...
          </>
        ) : (
          <>
            <Lock className="h-5 w-5" /> Submit Order / ${displayTotal.toFixed(2)}
          </>
        )}
      </button>

      {hasAttemptedSubmit && (uiSubmitError || uiValidationErrors.length > 0) && (
        <div className="border border-red-300 bg-red-50 p-4 text-red-900">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-red-700">
            Please complete the following:
          </h3>
          <ul className="space-y-1.5 text-sm">
            {uiSubmitError && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-red-700">&bull;</span>
                <span>{uiSubmitError}</span>
              </li>
            )}
            {uiValidationErrors.map((message, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-0.5 text-red-700">&bull;</span>
                <span>{message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-center text-sm text-brand-muted">
        <p>
          By placing your order, you agree to our{" "}
          <Link
            href="/legal/terms"
            className="font-semibold text-brand-text underline underline-offset-4 transition-colors hover:text-neutral-600"
          >
            Terms of Service
          </Link>
          {" and "}
          <Link
            href="/legal/privacy"
            className="font-semibold text-brand-text underline underline-offset-4 transition-colors hover:text-neutral-600"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </>
  );
}
