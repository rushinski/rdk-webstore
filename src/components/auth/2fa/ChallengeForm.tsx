// src/components/auth/2fa/ChallengeForm.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SixDigitCodeField } from "@/components/auth/ui/SixDigitCodeField";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { authStyles } from "@/components/auth/ui/authStyles";
import { mfaVerifyChallenge } from "@/services/mfa-service";

export function ChallengeForm() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => code.replace(/\D/g, "").length === 6, [code]);

  async function verify() {
    setMsg(null);

    const cleaned = code.replace(/\D/g, "").slice(0, 6);
    if (cleaned.length !== 6) {
      setMsg("Enter the 6-digit code.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await mfaVerifyChallenge(cleaned);
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
        <SixDigitCodeField
          id="mfa-code"
          label="Authentication code"
          value={code}
          onChange={setCode}
          disabled={isSubmitting}
        />

        {msg && <div className={authStyles.errorBox}>{msg}</div>}

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className={authStyles.primaryButton}
        >
          {isSubmitting ? "Verifying..." : "Verify"}
        </button>
      </form>
    </div>
  );
}
