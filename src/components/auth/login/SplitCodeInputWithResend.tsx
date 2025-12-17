// src/components/auth/login/SplitCodeInputWithResend.tsx
"use client";

import type { ComponentPropsWithoutRef } from "react";
import { SixDigitCodeField } from "@/components/auth/ui/SixDigitCodeField";

export interface SplitCodeInputWithResendProps
  extends Omit<ComponentPropsWithoutRef<"input">, "onChange" | "value"> {
  id?: string;
  label?: string;
  length?: number;
  value: string;
  onChange: (value: string) => void;

  onResend: () => void;
  isSending: boolean;
  cooldown: number;
  disabled?: boolean;

  resendSent?: boolean;
  resendError?: string | null;
}

export function SplitCodeInputWithResend({
  id = "code",
  label = "Code",
  length = 6,
  value,
  onChange,
  onResend,
  isSending,
  cooldown,
  disabled,
  resendSent,
  resendError,
  autoFocus = true,
  ...rest
}: SplitCodeInputWithResendProps & { autoFocus?: boolean }) {
  const resendDisabled = disabled || isSending || cooldown > 0;

  return (
    <div className="space-y-2">
      <SixDigitCodeField
        id={id}
        label={label}
        length={length}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={Boolean(resendError) || undefined}
        {...rest}
      />

      {/* Cooldown / resend under input, right-aligned */}
      <div className="flex justify-end text-[11px]">
        {isSending ? (
          <span className="text-neutral-500 dark:text-neutral-400">Sending…</span>
        ) : cooldown > 0 ? (
          <span className="text-neutral-500 dark:text-neutral-400">
            Resend code in {cooldown}s
          </span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={resendDisabled}
            className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 disabled:text-neutral-400"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
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
            <span>Resend code</span>
          </button>
        )}
      </div>

      {/* Success / error under resend */}
      <div className="min-h-[16px] text-right text-[11px]">
        {resendSent && <p className="text-emerald-500">Code resent.</p>}
        {resendError && <p className="text-red-500">{resendError}</p>}
      </div>
    </div>
  );
}
