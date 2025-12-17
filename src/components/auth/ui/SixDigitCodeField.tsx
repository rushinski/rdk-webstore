// src/components/auth/ui/SixDigitCodeField.tsx
"use client";

import type { ComponentPropsWithoutRef } from "react";
import { AuthStyles } from "./AuthStyles";

export interface SixDigitCodeFieldProps
  extends Omit<ComponentPropsWithoutRef<"input">, "onChange" | "value"> {
  id: string;
  label?: string;
  length?: number; // default 6
  value: string;
  onChange: (value: string) => void;
}

export function SixDigitCodeField({
  id,
  label,
  length = 6,
  value,
  onChange,
  disabled,
  autoFocus,
  ...rest
}: SixDigitCodeFieldProps) {
  function handleChange(raw: string) {
    const cleaned = raw.replace(/\D/g, "").slice(0, length);
    onChange(cleaned);
  }

  return (
    <div className="space-y-1.5">
      {label ? (
        <label
          htmlFor={id}
          className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          {label}
        </label>
      ) : null}

      <input
        id={id}
        name={id}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={length}
        value={value}
        onChange={(e) => handleChange(e.currentTarget.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        className={AuthStyles.input}
        {...rest}
      />
    </div>
  );
}
