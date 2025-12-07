"use client";

import type { ComponentPropsWithoutRef } from "react";

export interface CodeInputWithResendProps
  extends Omit<ComponentPropsWithoutRef<"input">, "onChange" | "value"> {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;

  // resend behavior
  onResend: () => void;
  isSending: boolean; // true while resend request is in-flight
  cooldown: number;   // seconds remaining; 0 = ready
  disabled?: boolean;

  // optional status messages
  resendSent?: boolean;
  resendError?: string | null;
}

export function CodeInputWithResend({
  id = "code",
  label = "Code",
  value,
  onChange,
  onResend,
  isSending,
  cooldown,
  disabled,
  resendSent,
  resendError,
  placeholder = "Enter the code",
  ...rest
}: CodeInputWithResendProps) {
  const resendDisabled = disabled || isSending || cooldown > 0;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-11 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 pr-10 text-sm text-neutral-900 dark:text-neutral-50 shadow-sm disabled:opacity-60"
          {...rest}
        />

        {/* Refresh icon button */}
        <button
          type="button"
          onClick={onResend}
          disabled={resendDisabled}
          className="absolute inset-y-0 right-2 flex items-center justify-center disabled:opacity-40"
          aria-label="Resend code"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${
              resendDisabled
                ? "text-neutral-400"
                : "text-neutral-700 dark:text-neutral-200"
            } ${isSending ? "animate-spin" : ""}`}
          >
            <path
              d="M4 4v6h6M20 20v-6h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5 13a7 7 0 0 0 12 3M19 11A7 7 0 0 0 7 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Cooldown + status text */}
      <div className="mt-1 flex justify-end text-[11px]">
        {isSending ? (
          <span className="text-neutral-500 dark:text-neutral-400">
            Sending…
          </span>
        ) : cooldown > 0 ? (
          <span className="text-neutral-500 dark:text-neutral-400">
            Resend code in {cooldown}s
          </span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={resendDisabled}
            className="text-red-600 dark:text-red-400 disabled:text-neutral-400"
          >
            Resend code
          </button>
        )}
      </div>

      <div className="min-h-[16px] text-right">
        {resendSent && (
          <p className="text-[11px] text-emerald-500">
            Code resent.
          </p>
        )}
        {resendError && (
          <p className="text-[11px] text-red-500">{resendError}</p>
        )}
      </div>
    </div>
  );
}
