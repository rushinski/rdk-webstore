// src/components/auth/login/PasswordField.tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  dataTestId?: string;
}

export function PasswordField({
  name,
  label,
  value,
  onChange,
  autoComplete,
  required = true,
  dataTestId,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-brand-text">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full border border-brand-border bg-brand-surface px-4 pr-11 text-sm text-brand-text placeholder:text-brand-muted outline-none transition-colors focus:border-brand-text"
          data-testid={dataTestId}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted transition-colors hover:text-brand-text"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
