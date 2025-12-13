// src/components/auth/login/SplitCodeInput.tsx
"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useRef } from "react";

export interface SplitCodeInputProps
  extends Omit<ComponentPropsWithoutRef<"input">, "onChange" | "value"> {
  id?: string;
  label?: string; // optional, no default
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

function CodeBoxes({
  length = 6,
  value,
  onChange,
  disabled,
  idPrefix,
  autoFocus,
  ariaLabelPrefix,
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  idPrefix?: string;
  autoFocus?: boolean;
  ariaLabelPrefix?: string;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (value.length > length) onChange(value.slice(0, length));
  }, [value, length, onChange]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function focusInput(index: number) {
    inputsRef.current[index]?.focus();
  }

  function applyDigitsFrom(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) return;

    const chars = digits.slice();
    let i = index;
    for (const ch of cleaned) {
      if (i >= length) break;
      chars[i] = ch;
      i += 1;
    }
    onChange(chars.join(""));

    const nextIndex = Math.min(index + cleaned.length, length - 1);
    focusInput(nextIndex);
  }

  function handleChange(index: number, raw: string) {
    if (disabled) return;

    if (!raw) {
      const chars = digits.slice();
      chars[index] = "";
      onChange(chars.join(""));
      return;
    }

    applyDigitsFrom(index, raw);
  }

  function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    if (disabled) return;
    e.preventDefault();
    applyDigitsFrom(index, e.clipboardData.getData("text") ?? "");
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (e.key === "Backspace") {
      if (digits[index]) return;
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
    <div className="flex items-center justify-center gap-2.5 sm:gap-3">
      {digits.map((digit, index) => {
        const isFirst = index === 0;
        const inputId = idPrefix && (isFirst ? idPrefix : `${idPrefix}-${index}`);

        return (
          <input
            key={index}
            id={inputId}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onPaste={(e) => handlePaste(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={disabled}
            autoFocus={autoFocus && isFirst}
            autoComplete={isFirst ? "one-time-code" : "off"}
            aria-label={
              ariaLabelPrefix ? `${ariaLabelPrefix} digit ${index + 1}` : `Code digit ${index + 1}`
            }
            className="h-12 w-11 sm:h-12 sm:w-12 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50 shadow-sm outline-none transition focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 disabled:opacity-60"
          />
        );
      })}
    </div>
  );
}

export function SplitCodeInput({
  id = "code",
  label, // no default
  length = 6,
  value,
  onChange,
  disabled,
  autoFocus = true,
}: SplitCodeInputProps) {
  return (
    <div className="space-y-2">
      {label ? (
        <label
          htmlFor={id}
          className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200 text-center"
        >
          {label}
        </label>
      ) : null}

      <CodeBoxes
        length={length}
        value={value}
        onChange={onChange}
        disabled={disabled}
        idPrefix={id}
        autoFocus={autoFocus}
        ariaLabelPrefix="Verification code"
      />
    </div>
  );
}
