"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useRef } from "react";

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

/**
 * Internal 6-box input (previously SplitCodeInput).
 * Not exported – only used by SplitCodeInputWithResend.
 */
function CodeBoxes({
  length = 6,
  value,
  onChange,
  disabled,
  idPrefix,
  autoFocus,
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  idPrefix?: string;
  autoFocus?: boolean;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Ensure we never keep more characters than length
  useEffect(() => {
    if (value.length > length) {
      onChange(value.slice(0, length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function focusInput(index: number) {
    const el = inputsRef.current[index];
    if (el) el.focus();
  }

  function handleChange(index: number, raw: string) {
    if (disabled) return;

    const cleaned = raw.replace(/\D/g, ""); // digits only
    if (!cleaned) {
      // Clear this position
      const chars = digits.slice();
      chars[index] = "";
      onChange(chars.join(""));
      return;
    }

    // Support pasting multiple digits
    const chars = digits.slice();
    let i = index;
    for (const ch of cleaned) {
      if (i >= length) break;
      chars[i] = ch;
      i += 1;
    }
    const next = chars.join("");
    onChange(next);

    const nextIndex = Math.min(index + cleaned.length, length - 1);
    focusInput(nextIndex);
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (disabled) return;

    if (e.key === "Backspace") {
      if (digits[index]) {
        // Just clear current digit; change handler will handle state
        return;
      }
      if (index > 0) {
        e.preventDefault();
        focusInput(index - 1);
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    }

    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {digits.map((digit, index) => {
        const isFirst = index === 0;
        const inputId =
          idPrefix && (isFirst ? idPrefix : `${idPrefix}-${index}`);

        return (
          <input
            key={index}
            id={inputId}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={disabled}
            autoFocus={autoFocus && isFirst}
            autoComplete={isFirst ? "one-time-code" : "off"}
            className="h-11 w-10 sm:w-11 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50 shadow-sm disabled:opacity-60"
          />
        );
      })}
    </div>
  );
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
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200 text-center"
        >
          {label}
        </label>
      )}

      {/* Wrapper makes resend row same width as boxes */}
      <div className="flex justify-center">
        <div className="inline-flex flex-col items-stretch gap-1">
          {/* Boxes */}
          <CodeBoxes
            length={length}
            value={value}
            onChange={onChange}
            disabled={disabled}
            idPrefix={id}
            autoFocus={autoFocus}
          />

          {/* Cooldown / resend under boxes, right-aligned */}
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

          {/* Success / error under resend, aligned with boxes */}
          <div className="min-h-[16px] text-right text-[11px]">
            {resendSent && (
              <p className="text-emerald-500">Code resent.</p>
            )}
            {resendError && (
              <p className="text-red-500">{resendError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
