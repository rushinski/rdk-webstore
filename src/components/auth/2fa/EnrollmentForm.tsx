// src/components/auth/2fa/EnrollmentForm.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SixDigitCodeField } from "@/components/auth/ui/SixDigitCodeField";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { authStyles } from "@/components/auth/ui/AuthStyles";
import { mfaEnroll, mfaVerifyEnrollment } from "@/services/mfa-service";

import { QRDisplay } from "./QRDisplay";

type CopyStatus = "idle" | "copied" | "error";

export function EnrollmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NEW: copy state for manual key
  const [manualCopyStatus, setManualCopyStatus] = useState<CopyStatus>("idle");
  const manualCopyResetTimer = useRef<number | null>(null);

  const canVerify = useMemo(() => code.replace(/\D/g, "").length === 6, [code]);
  const formatSecret = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();

  const extractSecret = (uri: string | null) => {
    if (!uri) {
      return null;
    }
    try {
      const parsed = new URL(uri);
      const secret = parsed.searchParams.get("secret");
      return secret || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    return () => {
      if (manualCopyResetTimer.current) {
        window.clearTimeout(manualCopyResetTimer.current);
      }
    };
  }, []);

  const writeClipboard = async (text: string) => {
    // Clipboard API (preferred)
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    // Fallback for older/mobile browsers
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.top = "-1000px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    if (!ok) {
      throw new Error("Copy failed");
    }
  };

  const handleCopyManualKey = async () => {
    if (!manualSecret) {
      return;
    }

    try {
      // Copy raw secret (no spaces)
      await writeClipboard(manualSecret);
      setManualCopyStatus("copied");
    } catch {
      setManualCopyStatus("error");
    } finally {
      if (manualCopyResetTimer.current) {
        window.clearTimeout(manualCopyResetTimer.current);
      }
      manualCopyResetTimer.current = window.setTimeout(
        () => setManualCopyStatus("idle"),
        2000,
      );
    }
  };

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
      setTotpUri(res.uri ?? null);
      setManualSecret(extractSecret(res.uri ?? null));
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

            {msg && <div className={authStyles.errorBox}>{msg}</div>}

            <button
              type="button"
              onClick={() => void startEnroll()}
              disabled={isGenerating}
              className={authStyles.primaryButton}
            >
              {isGenerating ? "Generating..." : "Generate QR code"}
            </button>

            <Link href="/auth/login" className={authStyles.neutralLink}>
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

            {/* UPDATED: no copyValue prop anymore */}
            <QRDisplay qrCode={qrCode} copyValue={totpUri ?? undefined} />

            {manualSecret && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
                <div className="text-xs uppercase tracking-wide text-zinc-500">
                  Manual setup key
                </div>

                {/* Tap/click to copy field */}
                <div className="mt-2">
                  <input
                    readOnly
                    value={formatSecret(manualSecret)}
                    // Mobile-friendly: click/pointer counts as a user gesture for clipboard permissions
                    onClick={() => void handleCopyManualKey()}
                    onPointerUp={() => void handleCopyManualKey()} // helps on some mobile browsers
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full cursor-pointer select-all rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs sm:text-sm text-white tracking-[0.12em] outline-none focus:border-zinc-600 active:border-zinc-600"
                    aria-label="Manual setup key (tap to copy)"
                    aria-describedby="manual-key-help"
                    data-testid="manual-secret-field"
                  />

                  <div id="manual-key-help" className="mt-2 text-xs text-zinc-500">
                    Tap the key to copy. If you cannot scan the QR, paste this key into
                    your authenticator app.
                  </div>

                  {/* Inline status feedback (reuses your timer/state) */}
                  {manualCopyStatus !== "idle" && (
                    <div className="mt-2 text-xs" aria-live="polite">
                      {manualCopyStatus === "copied" ? "Copied" : "Copy failed"}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!manualSecret && totpUri && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
                <div className="text-xs uppercase tracking-wide text-zinc-500">
                  Authenticator URI
                </div>
                <div className="mt-2 text-xs text-zinc-400 break-all">{totpUri}</div>
              </div>
            )}

            <SixDigitCodeField
              id="enroll-code"
              label="Verification code"
              value={code}
              onChange={setCode}
              disabled={isSubmitting}
            />

            {msg && <div className={authStyles.errorBox}>{msg}</div>}

            <button
              type="submit"
              disabled={!canVerify || isSubmitting}
              className={authStyles.primaryButton}
            >
              {isSubmitting ? "Verifying..." : "Verify & continue"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <Link href="/auth/login" className={authStyles.neutralLink}>
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
