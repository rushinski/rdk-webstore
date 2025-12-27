// app/components/ui/Checkbox.tsx
"use client";

import type { InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Checkbox({ label, className = "", ...props }: CheckboxProps) {
  return (
    <label className={`flex items-start gap-3 text-xs sm:text-sm text-zinc-400 cursor-pointer select-none ${className}`}>
      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center">
        <input
          type="checkbox"
          className="rdk-checkbox"
          {...props}
        />
      </span>
      <span className="leading-snug">
        {label}
      </span>
    </label>
  );
}
