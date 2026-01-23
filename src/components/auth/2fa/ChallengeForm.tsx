// src/components/auth/2fa/ChallengeForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SixDigitCodeField } from "@/components/auth/ui/SixDigitCodeField";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { AuthStyles } from "@/components/auth/ui/AuthStyles";
import { mfaStartChallenge, mfaVerifyChallenge } from "@/services/mfa-service";

export function ChallengeForm() {
  const router = useRouter();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(factorId && challengeId && code.length === 6),
    [code, factorId, challengeId],
  );

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
      setMsg("Challenge not initialized. Please try again.");
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
      <AuthHeader
        title="Verify your identity"
        description="Enter the code from your authenticator app."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
        className="space-y-4"
      >
        {isInitializing && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
            Preparing verification...
          </div>
        )}

        <SixDigitCodeField
          id="mfa-code"
          label="Authentication code"
          value={code}
          onChange={setCode}
          disabled={isSubmitting || isInitializing}
        />

        {msg && <div className={AuthStyles.errorBox}>{msg}</div>}

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting || isInitializing}
          className={AuthStyles.primaryButton}
        >
          {isSubmitting ? "Verifying..." : "Verify"}
        </button>
      </form>
    </div>
  );
}
