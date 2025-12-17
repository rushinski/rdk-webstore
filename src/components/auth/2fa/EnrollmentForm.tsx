// src/components/auth/2fa/EnrollmentForm.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QRDisplay } from "./QRDisplay";
import { SixDigitCodeField } from "@/components/auth/ui/SixDigitCodeField";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";
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

      router.push("/admin");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AuthHeader title="Set up 2FA" description="Scan the QR code, then confirm with a 6-digit code." />

      <div className="space-y-5">
        {!factorId && (
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 px-3 py-2.5 text-xs sm:text-sm text-neutral-600 dark:border-neutral-800/80 dark:bg-neutral-900/40 dark:text-neutral-300">
              Step 1: Generate a QR code and scan it with your authenticator app.
            </div>

            {msg && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400">
                {msg}
              </div>
            )}

            <button
              type="button"
              onClick={() => void startEnroll()}
              disabled={isGenerating}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-all hover:from-red-500 hover:to-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? "Generating…" : "Generate QR code"}
            </button>

            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 text-center">
              You can do this once per authenticator device.
            </p>

            <Link
              href="/auth/login"
              className="block text-left text-xs sm:text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100 underline underline-offset-2"
            >
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
            <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 px-3 py-2.5 text-xs sm:text-sm text-neutral-600 dark:border-neutral-800/80 dark:bg-neutral-900/40 dark:text-neutral-300">
              Step 2: Scan the QR code, then enter the 6-digit code to confirm.
            </div>

            <QRDisplay qrCode={qrCode} />

            <SixDigitCodeField id="enroll-code" label="6-digit code" value={code} onChange={setCode} disabled={isSubmitting} />

            {msg && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400">
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={!canVerify || isSubmitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-all hover:from-red-500 hover:to-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Confirming…" : "Verify code"}
            </button>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
              <Link
                href="/auth/login"
                className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100 underline underline-offset-2"
              >
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
                className="text-red-600 hover:text-red-500 underline underline-offset-2"
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
