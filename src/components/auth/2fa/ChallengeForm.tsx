// src/components/auth/2fa/ChallengeForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SplitCodeInput } from "@/components/auth/2fa/SplitCodeInput";
import { mfaStartChallenge, mfaVerifyChallenge } from "@/services/mfa-service";

export function ChallengeForm() {
  const router = useRouter();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(factorId && challengeId && code.length === 6);
  }, [code, factorId, challengeId]);

  useEffect(() => {
    (async () => {
      setIsInitializing(true);
      setMsg(null);

      const res = await mfaStartChallenge();
      if (res.error) {
        setMsg(res.error);
        setIsInitializing(false);
        return;
      }

      setFactorId(res.factorId);
      setChallengeId(res.challengeId);
      setIsInitializing(false);
    })();
  }, []);

  async function verify() {
    setMsg(null);

    if (!factorId || !challengeId) {
      setMsg("Challenge not initialized. Please refresh the page and try again.");
      return;
    }

    const cleaned = code.replace(/\D/g, "").slice(0, 6);
    if (cleaned.length !== 6) {
      setMsg("Enter the 6-digit code.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await mfaVerifyChallenge(factorId, challengeId, cleaned);
      if (res.error) {
        setMsg(res.error);
        return;
      }

      router.push("/admin");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="space-y-2.5 text-center">
        <div className="inline-flex items-center justify-center rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-500">
          Real Deal Kickz
        </div>

        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Confirm your sign-in
        </h1>

        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
        className="space-y-5"
      >
        {isInitializing && (
          <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 px-3 py-2.5 text-xs sm:text-sm text-neutral-600 dark:border-neutral-800/80 dark:bg-neutral-900/40 dark:text-neutral-300">
            Preparing your verification challenge…
          </div>
        )}

        {/* 6-box input (no label) */}
        <div className="pt-1">
          <SplitCodeInput
            id="mfa-code"
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            disabled={isSubmitting || isInitializing}
          />
        </div>

        {msg && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400">
            {msg}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting || isInitializing}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-all hover:from-red-500 hover:to-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Verifying…" : "Verify"}
        </button>
      </form>
    </div>
  );
}
