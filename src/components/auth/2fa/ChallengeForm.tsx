// app/auth/components/mfa/ChallengeForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    const cleaned = code.replace(/\D/g, "");
    return Boolean(factorId && challengeId && cleaned.length === 6);
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
      setMsg("Challenge not initialized. Please refresh and try again.");
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
    <div className="space-y-6">
      {/* Header (owned by the form, consistent with Login/Register) */}
      <div className="space-y-2 text-center">
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
        className="space-y-4"
      >
        {/* Status */}
        {isInitializing && (
          <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 px-3 py-2.5 text-xs sm:text-sm text-neutral-600 dark:border-neutral-800/80 dark:bg-neutral-900/40 dark:text-neutral-300">
            Preparing your verification challenge…
          </div>
        )}

        {/* Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="mfa-code"
            className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200"
          >
            6-digit code
          </label>

          <input
            id="mfa-code"
            name="code"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
            maxLength={6}
            aria-invalid={Boolean(msg) || undefined}
            className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-center font-mono text-sm tracking-[0.35em] text-neutral-900 shadow-sm outline-none transition focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />

          <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">
            Use the code from your Authenticator app.
          </p>
        </div>

        {/* Error */}
        {msg && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400">
            {msg}
          </div>
        )}

        {/* Actions */}
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting || isInitializing}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-all hover:from-red-500 hover:to-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Verifying…" : "Verify"}
        </button>

        <div className="flex items-center justify-between text-xs sm:text-sm">
          <Link
            href="/auth/login"
            className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
          >
            Back to sign in
          </Link>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-red-600 hover:text-red-500"
          >
            Refresh
          </button>
        </div>
      </form>
    </div>
  );
}
