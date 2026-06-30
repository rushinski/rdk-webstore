// src/components/auth/register/PasswordRequirements.tsx
"use client";

import { Check, X } from "lucide-react";

import { evaluatePasswordRequirements } from "@/lib/validation/password";

export function PasswordRequirements({ password }: { password: string }) {
  const req = evaluatePasswordRequirements(password);

  return (
    <div className="space-y-2 border border-brand-border bg-brand-page p-4">
      <p className="mb-3 text-xs uppercase tracking-[0.12em] text-brand-muted">
        Password requirements
      </p>
      <div className="grid grid-cols-2 gap-2">
        <RequirementItem ok={req.minLength} text="8+ characters" />
        <RequirementItem ok={req.notRepeatedChar} text="Varied characters" />
      </div>
    </div>
  );
}

function RequirementItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-4 w-4 items-center justify-center ${
          ok ? "text-emerald-600" : "text-brand-muted"
        }`}
      >
        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </div>
      <span className={`text-xs ${ok ? "text-brand-text" : "text-brand-muted"}`}>
        {text}
      </span>
    </div>
  );
}
