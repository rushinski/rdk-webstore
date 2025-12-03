// app/components/ui/PasswordField.tsx
"use client";

import { useState } from "react";

interface PasswordFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
}

export function PasswordField({
  name,
  label,
  value,
  onChange,
  autoComplete,
  required = true,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  const type = visible ? "text" : "password";

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 pr-10 text-sm text-neutral-900 dark:text-neutral-50 shadow-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent rounded-full"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 5C7.45455 5 3.45455 7.94 1.5 12C3.45455 16.06 7.45455 19 12 19C16.5455 19 20.5455 16.06 22.5 12C20.5455 7.94 16.5455 5 12 5ZM12 16C9.79091 16 8 14.2091 8 12C8 9.79091 9.79091 8 12 8C14.2091 8 16 9.79091 16 12C16 14.2091 14.2091 16 12 16ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"
        fill="currentColor"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M3.70711 2.29289L2.29289 3.70711L5.0468 6.46101C3.52922 7.5337 2.26266 8.97358 1.5 10.9999C3.45455 15.0599 7.45455 17.9999 12 17.9999C13.5494 17.9999 15.0347 17.6732 16.3973 17.0864L20.2929 20.982L21.7071 19.5678L3.70711 2.29289ZM9.81791 8.23211L11.2409 9.65505C11.4865 9.58141 11.7389 9.54541 12 9.54541C13.35 9.54541 14.4545 10.6499 14.4545 11.9999C14.4545 12.261 14.4185 12.5134 14.3449 12.759L15.7679 14.182C16.13 13.5255 16.3636 12.7873 16.3636 11.9999C16.3636 9.79086 14.5727 7.99996 12.3636 7.99996C11.5762 7.99996 10.838 8.23351 10.1815 8.59564L9.81791 8.23211Z"
        fill="currentColor"
      />
    </svg>
  );
}
