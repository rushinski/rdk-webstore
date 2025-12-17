// src/components/auth/register/PasswordRequirements.tsx
"use client";

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
    <div className="mt-3 rounded-xl border border-transparent
">
      <p className="text-[11px] font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
        Password Requirements
      </p>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-700 dark:text-neutral-300">
        <RequirementItem ok={req.minLength} text="8+ characters" />
        <RequirementItem ok={req.hasLetter} text="Contains letters" />
        <RequirementItem ok={req.hasNumberOrSymbol} text="Number or symbol" />
        <RequirementItem ok={req.notRepeatedChar} text="Not repeating chars" />
      </div>
    </div>
  );
}

function RequirementItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] ${
          ok
            ? "bg-green-500 text-white"
            : "bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
        }`}
      >
        {ok ? "✓" : "•"}
      </span>
      <span>{text}</span>
    </div>
  );
}
