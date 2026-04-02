// src/components/auth/ui/SixDigitCodeField.tsx
"use client";

import type { ComponentPropsWithoutRef } from "react";

export interface SixDigitCodeFieldProps
  extends Omit<ComponentPropsWithoutRef<"input">, "onChange" | "value"> {
  id: string;
  label?: string;
  length?: number;
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
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-white">
          {label}
        </label>
      )}

      <input
        id={id}
        name={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={length}
        value={value}
        onChange={(e) => handleChange(e.currentTarget.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        className="h-11 w-full bg-zinc-900 border border-zinc-800 px-4 text-left text-lg font-mono tracking-[0.5em] text-white focus:outline-none focus:border-zinc-700 transition-colors disabled:opacity-50"
        {...rest}
      />
    </div>
  );
}
