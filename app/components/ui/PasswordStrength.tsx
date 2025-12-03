// app/components/ui/PasswordStrength.tsx
"use client";

import { useState } from "react";

export type PasswordStrengthLabel = "Weak" | "Medium" | "Strong";

export interface PasswordRulesState {
  length: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

export function evaluatePassword(password: string): {
  label: PasswordStrengthLabel;
  rules: PasswordRulesState;
} {
  const rules: PasswordRulesState = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(rules).filter(Boolean).length;

  let label: PasswordStrengthLabel = "Weak";
  if (score >= 4) label = "Strong";
  else if (score >= 2) label = "Medium";

  return { label, rules };
}

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const [open, setOpen] = useState(false);
  const { label, rules } = evaluatePassword(password);

  const colorClass =
    label === "Strong"
      ? "text-green-500"
      : label === "Medium"
      ? "text-amber-500"
      : "text-red-500";

  return (
    <div className="mt-1.5 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="text-neutral-500 dark:text-neutral-400">
          Password strength:{" "}
          <span className={`font-medium ${colorClass}`}>{label}</span>
        </span>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-600 text-[10px] font-semibold text-neutral-500 dark:text-neutral-300 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          aria-label="View password rules"
          aria-expanded={open}
        >
          ?
        </button>
      </div>

      {/* Tooltip / collapsible */}
      <div
        className={`origin-top transition-all ${
          open
            ? "opacity-100 max-h-40 mt-1"
            : "opacity-0 max-h-0 pointer-events-none"
        }`}
      >
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/90 dark:bg-neutral-900/90 px-3 py-2 text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-300 shadow-sm">
          <p className="mb-1 font-medium text-neutral-700 dark:text-neutral-100">
            Your password must include:
          </p>
          <ul className="space-y-0.5">
            <PasswordRuleItem ok={rules.length} text="At least 8 characters" />
            <PasswordRuleItem ok={rules.uppercase} text="At least 1 uppercase letter" />
            <PasswordRuleItem ok={rules.number} text="At least 1 number" />
            <PasswordRuleItem ok={rules.special} text="At least 1 special character" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function PasswordRuleItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${
          ok ? "bg-green-500 text-white" : "bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
        }`}
      >
        {ok ? "✓" : "•"}
      </span>
      <span>{text}</span>
    </li>
  );
}
