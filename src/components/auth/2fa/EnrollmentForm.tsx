// src/components/auth/2fa/EnrollmentForm.tsx
"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { lazy, Suspense } from "react";

import { SixDigitCodeField } from "@/components/auth/ui/SixDigitCodeField";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { authStyles } from "@/components/auth/ui/authStyles";
import { mfaEnroll, mfaVerifyEnrollment } from "@/services/mfa-service";
import { isMobileDevice } from "@/lib/utils/device";

// Lazy load QR component for desktop only
const QRDisplay = lazy(() => 
  import("./QRDisplay").then(mod => ({ default: mod.QRDisplay }))
);

type EnrollState = {
  factorId: string | null;
  qrCode: string | null;
  totpUri: string | null;
  manualSecret: string | null;
  code: string;
  msg: string | null;
  isGenerating: boolean;
  isSubmitting: boolean;
  copyStatus: "idle" | "copied" | "error";
  isMobile: boolean;
};

type Action =
  | { type: "SET_MOBILE"; isMobile: boolean }
  | { type: "START_GENERATING" }
  | { type: "ENROLL_SUCCESS"; data: { factorId: string; qrCode?: string; uri: string; secret: string } }
  | { type: "ENROLL_ERROR"; error: string }
  | { type: "SET_CODE"; code: string }
  | { type: "START_VERIFYING" }
  | { type: "VERIFY_ERROR"; error: string }
  | { type: "COPY_SUCCESS" }
  | { type: "COPY_ERROR" }
  | { type: "RESET_COPY" }
  | { type: "RESET_ENROLLMENT" }
  | { type: "QR_EXPIRED" };

function reducer(state: EnrollState, action: Action): EnrollState {
  switch (action.type) {
    case "SET_MOBILE":
      return { ...state, isMobile: action.isMobile };
    case "START_GENERATING":
      return { ...state, isGenerating: true, msg: null };
    case "ENROLL_SUCCESS":
      return {
        ...state,
        isGenerating: false,
        factorId: action.data.factorId,
        qrCode: action.data.qrCode ?? null,
        totpUri: action.data.uri,
        manualSecret: action.data.secret,
        code: "",
      };
    case "ENROLL_ERROR":
      return { ...state, isGenerating: false, msg: action.error };
    case "SET_CODE":
      return { ...state, code: action.code };
    case "START_VERIFYING":
      return { ...state, isSubmitting: true, msg: null };
    case "VERIFY_ERROR":
      return { ...state, isSubmitting: false, msg: action.error };
    case "COPY_SUCCESS":
      return { ...state, copyStatus: "copied" };
    case "COPY_ERROR":
      return { ...state, copyStatus: "error" };
    case "RESET_COPY":
      return { ...state, copyStatus: "idle" };
    case "QR_EXPIRED":
      return {
        ...state,
        qrCode: null,
        totpUri: null,
        manualSecret: null,
        msg: "QR code expired. Please generate a new one.",
      };
    case "RESET_ENROLLMENT":
      return {
        ...state,
        factorId: null,
        qrCode: null,
        totpUri: null,
        manualSecret: null,
        code: "",
        msg: null,
      };
    default:
      return state;
  }
}

export function EnrollmentForm() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    factorId: null,
    qrCode: null,
    totpUri: null,
    manualSecret: null,
    code: "",
    msg: null,
    isGenerating: false,
    isSubmitting: false,
    copyStatus: "idle",
    isMobile: false,
  });

  const copyResetTimer = useRef<number | null>(null);
  const qrExpiryTimer = useRef<number | null>(null);

  useEffect(() => {
    dispatch({ type: "SET_MOBILE", isMobile: isMobileDevice() });
  }, []);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) window.clearTimeout(copyResetTimer.current);
      if (qrExpiryTimer.current) window.clearTimeout(qrExpiryTimer.current);
    };
  }, []);

  // Only start QR expiry timer if we have a QR (desktop only)
  useEffect(() => {
    if (qrExpiryTimer.current) {
      window.clearTimeout(qrExpiryTimer.current);
      qrExpiryTimer.current = null;
    }

    if (state.factorId && state.qrCode && !state.isMobile) {
      qrExpiryTimer.current = window.setTimeout(() => {
        dispatch({ type: "QR_EXPIRED" });
      }, 5 * 60 * 1000);
    }

    return () => {
      if (qrExpiryTimer.current) {
        window.clearTimeout(qrExpiryTimer.current);
      }
    };
  }, [state.factorId, state.qrCode, state.isMobile]);

  const canVerify = state.code.replace(/\D/g, "").length === 6;

  const extractSecret = (uri: string): string => {
    try {
      return new URL(uri).searchParams.get("secret") || "";
    } catch {
      return "";
    }
  };

  const formatSecret = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();

  async function startEnroll() {
    dispatch({ type: "START_GENERATING" });

    try {
      const res = await mfaEnroll(state.isMobile);
      if (res.error) {
        dispatch({ type: "ENROLL_ERROR", error: res.error });
        return;
      }

      dispatch({
        type: "ENROLL_SUCCESS",
        data: {
          factorId: res.factorId,
          qrCode: res.qrCode,
          uri: res.uri ?? "",
          secret: extractSecret(res.uri ?? ""),
        },
      });
    } catch (err) {
      dispatch({ type: "ENROLL_ERROR", error: "Failed to generate enrollment data" });
    }
  }

  async function regenerate() {
    dispatch({ type: "RESET_ENROLLMENT" });
    await startEnroll();
  }

  async function verify() {
    if (!state.factorId) {
      dispatch({ type: "VERIFY_ERROR", error: "Missing factor ID. Please regenerate." });
      return;
    }

    const cleaned = state.code.replace(/\D/g, "").slice(0, 6);
    if (cleaned.length !== 6) {
      dispatch({ type: "VERIFY_ERROR", error: "Enter the 6-digit code." });
      return;
    }

    dispatch({ type: "START_VERIFYING" });

    try {
      const res = await mfaVerifyEnrollment(state.factorId, cleaned);
      if (res.error) {
        dispatch({ type: "VERIFY_ERROR", error: res.error });
        return;
      }
      router.push("/admin");
    } catch {
      dispatch({ type: "VERIFY_ERROR", error: "Verification failed" });
    }
  }

  async function handleCopyManualKey() {
    if (!state.manualSecret) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(state.manualSecret);
      } else {
        const el = document.createElement("textarea");
        el.value = state.manualSecret;
        el.style.cssText = "position:fixed;top:-1000px";
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(el);
        if (!ok) throw new Error();
      }
      dispatch({ type: "COPY_SUCCESS" });
    } catch {
      dispatch({ type: "COPY_ERROR" });
    } finally {
      if (copyResetTimer.current) window.clearTimeout(copyResetTimer.current);
      copyResetTimer.current = window.setTimeout(() => dispatch({ type: "RESET_COPY" }), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <AuthHeader
        title="Set up 2FA"
        description={
          state.isMobile
            ? "Copy the setup key to your authenticator app, then verify."
            : "Scan the QR code with your authenticator app, then verify."
        }
      />

      <div className="space-y-5">
        {/* STATE 1: Not started */}
        {!state.factorId && (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
              {state.isMobile
                ? "Generate a setup key for your authenticator app."
                : "Generate a QR code and scan it with your authenticator app."}
            </div>

            {state.msg && <div className={authStyles.errorBox}>{state.msg}</div>}

            <button
              type="button"
              onClick={() => void startEnroll()}
              disabled={state.isGenerating}
              className={authStyles.primaryButton}
            >
              {state.isGenerating ? "Generating..." : state.isMobile ? "Generate setup key" : "Generate QR code"}
            </button>

            <Link href="/auth/login" className={authStyles.neutralLink}>
              Back to sign in
            </Link>
          </div>
        )}

        {/* STATE 2: Enrollment started but QR expired (desktop only) */}
        {state.factorId && !state.qrCode && !state.isMobile && (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
              Your QR code is no longer available. Generate a new one to continue.
            </div>

            {state.msg && <div className={authStyles.errorBox}>{state.msg}</div>}

            <button
              type="button"
              onClick={() => void regenerate()}
              disabled={state.isGenerating || state.isSubmitting}
              className={authStyles.primaryButton}
            >
              {state.isGenerating ? "Generating..." : "Generate new QR code"}
            </button>

            <Link href="/auth/login" className={authStyles.neutralLink}>
              Back to sign in
            </Link>
          </div>
        )}

        {/* STATE 3: Normal enrollment flow */}
        {state.factorId && (state.qrCode || state.isMobile) && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verify();
            }}
            className="space-y-4"
          >
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
              {state.isMobile
                ? "Copy the setup key below, then enter the 6-digit code to confirm."
                : "Scan the QR code, then enter the 6-digit code to confirm."}
            </div>

            {/* Desktop: Show QR code */}
            {!state.isMobile && state.qrCode && (
              <Suspense fallback={
                <div className="border border-zinc-800 bg-zinc-900/50 p-6">
                  <div className="flex justify-center">
                    <div className="h-48 w-48 bg-zinc-800 animate-pulse" />
                  </div>
                </div>
              }>
                <QRDisplay
                  qrCode={state.qrCode}
                  onQrError={() => {
                    dispatch({
                      type: "VERIFY_ERROR",
                      error: "QR code could not be displayed. Please generate a new one.",
                    });
                    dispatch({ type: "QR_EXPIRED" });
                  }}
                />
              </Suspense>
            )}

            {/* Manual setup key - always show */}
            {state.manualSecret && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
                <div className="text-xs uppercase tracking-wide text-zinc-500">
                  Manual setup key
                </div>

                <div className="mt-2">
                  <input
                    readOnly
                    value={formatSecret(state.manualSecret)}
                    onClick={() => void handleCopyManualKey()}
                    onPointerUp={() => void handleCopyManualKey()}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full cursor-pointer select-all rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs sm:text-sm text-white tracking-[0.12em] outline-none focus:border-zinc-600 active:border-zinc-600"
                    aria-label="Manual setup key (tap to copy)"
                  />

                  <div className="mt-2 text-xs text-zinc-500">
                    Tap the key to copy. {state.isMobile ? "Paste this" : "If you cannot scan the QR, paste this"} key into your authenticator app.
                  </div>

                  {state.copyStatus !== "idle" && (
                    <div className="mt-2 text-xs" aria-live="polite">
                      {state.copyStatus === "copied" ? "✓ Copied" : "Copy failed"}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Desktop only: Regenerate button */}
            {!state.isMobile && (
              <button
                type="button"
                onClick={() => void regenerate()}
                disabled={state.isGenerating || state.isSubmitting}
                className={authStyles.primaryButton}
              >
                {state.isGenerating ? "Generating..." : "Regenerate QR code"}
              </button>
            )}

            <SixDigitCodeField
              id="enroll-code"
              label="Verification code"
              value={state.code}
              onChange={(code) => dispatch({ type: "SET_CODE", code })}
              disabled={state.isSubmitting}
            />

            {state.msg && <div className={authStyles.errorBox}>{state.msg}</div>}

            <button
              type="submit"
              disabled={!canVerify || state.isSubmitting}
              className={authStyles.primaryButton}
            >
              {state.isSubmitting ? "Verifying..." : "Verify & continue"}
            </button>

            <Link href="/auth/login" className={authStyles.neutralLink}>
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}