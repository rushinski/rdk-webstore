// app/components/ui/PasswordStrength.tsx
"use client";

import { useState, useRef, useEffect } from "react";

export interface PasswordRequirementState {
  minLength: boolean;
  hasLetter: boolean;
  hasNumberOrSymbol: boolean;
  notRepeatedChar: boolean;
}

export function evaluateRequirements(password: string): PasswordRequirementState {
  const repeated = password.split("").every((c) => c === password[0]);

  return {
    minLength: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumberOrSymbol: /[\d\W]/.test(password),
    notRepeatedChar: password.length > 0 && !repeated,
  };
}

export type StrengthLabel = "Weak" | "Medium" | "Strong";

export function getStrength(password: string): StrengthLabel {
  if (!password) return "Weak";

  const length = password.length;

  // character variety indicator
  const varietyCount = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /\W/.test(password),
  ].filter(Boolean).length;

  if (length >= 14 && varietyCount >= 3) return "Strong";
  if (length >= 10 && varietyCount >= 2) return "Medium";
  return "Weak";
}

export function PasswordStrength({ password }: { password: string }) {
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [strengthInfoOpen, setStrengthInfoOpen] = useState(false);

  const reqRef = useRef<HTMLDivElement | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);

  const requirements = evaluateRequirements(password);
  const strength = getStrength(password);

  const strengthColor =
    strength === "Strong"
      ? "text-green-500"
      : strength === "Medium"
      ? "text-amber-500"
      : "text-red-500";

  // Close popovers when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        reqRef.current &&
        !reqRef.current.contains(e.target as Node) &&
        infoRef.current &&
        !infoRef.current.contains(e.target as Node)
      ) {
        setRequirementsOpen(false);
        setStrengthInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative mt-1.5 space-y-2">
      <div className="flex justify-between items-center text-xs sm:text-sm">
        <span className="text-neutral-500 dark:text-neutral-400">
          Strength:{" "}
          <span className={`font-medium ${strengthColor}`}>{strength}</span>
        </span>

        <div className="flex items-center gap-2">
          {/* Strength info tooltip button */}
          <button
            type="button"
            className="h-5 w-5 text-[10px] rounded-full border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-200"
            onClick={() => {
              setStrengthInfoOpen((x) => !x);
              setRequirementsOpen(false);
            }}
          >
            i
          </button>

          {/* Requirements tooltip button */}
          <button
            type="button"
            className="h-5 w-5 text-[10px] rounded-full border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-200"
            onClick={() => {
              setRequirementsOpen((x) => !x);
              setStrengthInfoOpen(false);
            }}
          >
            ?
          </button>
        </div>
      </div>

      {/* REQUIREMENTS POPOVER */}
      {requirementsOpen && (
        <div
          ref={reqRef}
          className="absolute right-0 mt-2 w-64 z-50 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/95 dark:bg-neutral-900/95 shadow-xl p-3"
        >
          <p className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
            Password Requirements
          </p>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-700 dark:text-neutral-300">
            <RequirementItem ok={requirements.minLength} text="8+ characters" />
            <RequirementItem ok={requirements.hasLetter} text="Contains letters" />
            <RequirementItem
              ok={requirements.hasNumberOrSymbol}
              text="Number or symbol"
            />
            <RequirementItem
              ok={requirements.notRepeatedChar}
              text="Not repeating chars"
            />
          </div>
        </div>
      )}

      {/* STRENGTH INFO POPOVER */}
      {strengthInfoOpen && (
        <div
          ref={infoRef}
          className="absolute right-10 mt-2 w-64 z-50 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/95 dark:bg-neutral-900/95 shadow-xl p-3"
        >
          <p className="text-xs font-semibold mb-2 text-neutral-700 dark:text-neutral-200">
            What Makes a Strong Password?
          </p>

          <ul className="text-[11px] space-y-1 text-neutral-700 dark:text-neutral-300">
            <li>• 14+ characters</li>
            <li>• Mix of letters, numbers, and symbols</li>
            <li>• Avoid real words</li>
            <li>• Avoid repeating characters</li>
            <li>• Use a unique password for each account</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function RequirementItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex h-3 w-3 items-center justify-center rounded-full text-[9px] ${
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
