// src/components/auth/register/PasswordRequirements.tsx
"use client";

import { Check, X } from "lucide-react";

import { evaluatePasswordRequirements } from "@/lib/validation/password";

export function PasswordRequirements({ password }: { password: string }) {
  const req = evaluatePasswordRequirements(password);

  return (
    <div className="border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
      <p className="text-xs text-zinc-500 mb-3">Password requirements:</p>
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
          ok ? "text-emerald-500" : "text-zinc-600"
        }`}
      >
        {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
      <span className={`text-xs ${ok ? "text-zinc-300" : "text-zinc-600"}`}>{text}</span>
    </div>
  );
}
