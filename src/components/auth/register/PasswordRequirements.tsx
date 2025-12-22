// src/components/auth/register/PasswordRequirements.tsx
"use client";

import { Check, X } from "lucide-react";

export interface PasswordRequirementState {
  minLength: boolean;
  hasLetter: boolean;
  hasNumberOrSymbol: boolean;
  notRepeatedChar: boolean;
}

export function evaluateRequirements(password: string): PasswordRequirementState {
  const repeated = password.length > 0 && password.split("").every((c) => c === password[0]);

  return {
    minLength: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumberOrSymbol: /[\d\W]/.test(password),
    notRepeatedChar: !repeated,
  };
}

export function PasswordRequirements({ password }: { password: string }) {
  const req = evaluateRequirements(password);

  return (
    <div className="border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
      <p className="text-xs text-zinc-500 mb-3">Password requirements:</p>
      <div className="grid grid-cols-2 gap-2">
        <RequirementItem ok={req.minLength} text="8+ characters" />
        <RequirementItem ok={req.hasLetter} text="Letters" />
        <RequirementItem ok={req.hasNumberOrSymbol} text="Number/symbol" />
        <RequirementItem ok={req.notRepeatedChar} text="Varied chars" />
      </div>
    </div>
  );
}

function RequirementItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-4 w-4 items-center justify-center ${
          ok ? "text-emerald-500" : "text-zinc-600"
        }`}
      >
        {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
      <span className={`text-xs ${ok ? "text-zinc-300" : "text-zinc-600"}`}>{text}</span>
    </div>
  );
}