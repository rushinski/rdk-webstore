"use client";

import type { ComponentPropsWithoutRef } from "react";
import { SplitCodeInput } from "./SplitCodeInput";

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

  // NEW: how many code digits
  length?: number;    // default: 6
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
  length = 6,
  ...rest
}: CodeInputWithResendProps) {
  const resendDisabled = disabled || isSending || cooldown > 0;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          // label targets the first box
          htmlFor={id}
          className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          {label}
        </label>
      )}

      <div className="relative flex justify-center" {...rest}>
        <SplitCodeInput
          length={length}
          value={value}
          onChange={onChange}
          disabled={disabled}
          idPrefix={id}
          autoFocus
        />

        {/* Refresh icon button, anchored to the right of the boxes */}
        <button
          type="button"
          onClick={onResend}
          disabled={resendDisabled}
          className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center pr-1 pl-2 disabled:opacity-40"
          aria-label={cooldown > 0 ? `Resend code in ${cooldown} seconds` : "Resend code"}
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

      {/* Simple helper text for screen readers */}
      {placeholder && (
        <p className="sr-only">
          {placeholder}
        </p>
      )}
    </div>
  );
}
