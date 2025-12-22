// src/components/auth/2fa/EnrollmentForm.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QRDisplay } from "./QRDisplay";
import { SixDigitCodeField } from "@/components/auth/ui/SixDigitCodeField";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { AuthStyles } from "@/components/auth/ui/AuthStyles";
import { mfaEnroll, mfaVerifyEnrollment } from "@/services/mfa-service";

export function EnrollmentForm() {
  const router = useRouter();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canVerify = useMemo(() => code.replace(/\D/g, "").length === 6, [code]);

  async function startEnroll() {
    setMsg(null);
    setIsGenerating(true);

    try {
      const res = await mfaEnroll();
      if (res.error) {
        setMsg(res.error);
        return;
      }

      setFactorId(res.factorId);
      setQrCode(res.qrCode);
    } finally {
      setIsGenerating(false);
    }
  }

  async function verify() {
    setMsg(null);

    if (!factorId) {
      setMsg("Missing factor ID. Please regenerate the QR code.");
      return;
    }

    const cleaned = code.replace(/\D/g, "").slice(0, 6);
    if (cleaned.length !== 6) {
      setMsg("Enter the 6-digit code.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await mfaVerifyEnrollment(factorId, cleaned);
      if (res.error) {
        setMsg(res.error);
        return;
      }

      // Success - user is now fully authenticated with admin cookie set
      router.push("/admin");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AuthHeader
        title="Set up 2FA"
        description="Scan the QR code with your authenticator app, then verify."
      />

      <div className="space-y-5">
        {!factorId && (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
              Generate a QR code and scan it with your authenticator app.
            </div>

            {msg && <div className={AuthStyles.errorBox}>{msg}</div>}

            <button
              type="button"
              onClick={() => void startEnroll()}
              disabled={isGenerating}
              className={AuthStyles.primaryButton}
            >
              {isGenerating ? "Generating..." : "Generate QR code"}
            </button>

            <Link href="/auth/login" className={AuthStyles.neutralLink}>
              Back to sign in
            </Link>
          </div>
        )}

        {factorId && qrCode && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verify();
            }}
            className="space-y-4"
          >
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
              Scan the QR code, then enter the 6-digit code to confirm.
            </div>

            <QRDisplay qrCode={qrCode} />

            <SixDigitCodeField
              id="enroll-code"
              label="Verification code"
              value={code}
              onChange={setCode}
              disabled={isSubmitting}
            />

            {msg && <div className={AuthStyles.errorBox}>{msg}</div>}

            <button
              type="submit"
              disabled={!canVerify || isSubmitting}
              className={AuthStyles.primaryButton}
            >
              {isSubmitting ? "Verifying..." : "Verify & continue"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <Link href="/auth/login" className={AuthStyles.neutralLink}>
                Back to sign in
              </Link>

              <button
                type="button"
                onClick={() => {
                  setFactorId(null);
                  setQrCode(null);
                  setCode("");
                  setMsg(null);
                }}
                className={AuthStyles.accentLink}
              >
                Regenerate
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}