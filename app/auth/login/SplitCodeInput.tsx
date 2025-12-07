"use client";

import { useEffect, useRef } from "react";

interface SplitCodeInputProps {
  length?: number;           // default: 6
  value: string;             // full code string (e.g. "123456")
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SplitCodeInput({
  length = 6,
  value,
  onChange,
  disabled,
}: SplitCodeInputProps) {
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

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
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
      {digits.map((digit, index) => (
        <input
          key={index}
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
          className="h-11 w-10 sm:w-11 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50 shadow-sm disabled:opacity-60"
        />
      ))}
    </div>
  );
}
