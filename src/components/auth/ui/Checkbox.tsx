// app/components/ui/Checkbox.tsx
"use client";

import type { InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Checkbox({ label, className = "", ...props }: CheckboxProps) {
  return (
    <label className={`flex items-start gap-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer select-none ${className}`}>
      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center">
        <input
          type="checkbox"
          className="peer h-4 w-4 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-transparent transition-all"
          {...props}
        />
      </span>
      <span className="leading-snug">
        {label}
      </span>
    </label>
  );
}
