"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CodeInputWithResend } from "./CodeInputWithResend";

interface OtpLoginFormProps {
  onBackToPassword: () => void;
  onRequiresEmailVerification: (email: string) => void;
}

type OtpStage = "request" | "verify";

export function OtpLoginForm({
  onBackToPassword,
  onRequiresEmailVerification,
}: OtpLoginFormProps) {
  const router = useRouter();

  const [otpStage, setOtpStage] = useState<OtpStage>("request");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // resend state for OTP
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isSendingResend, setIsSendingResend] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      if (otpStage === "request") {
        const res = await fetch("/api/auth/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: otpEmail }),
        });

        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? "Could not send code");
        }

        setOtpStage("verify");
        setInfoMessage(
          "We’ve emailed you a one-time code. Enter it below to sign in."
        );
        // start cooldown after first send
        setResendSent(false);
        setResendError(null);
        setResendCooldown(60);
      } else {
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: otpEmail, code: otpCode }),
        });

        const json = await res.json();

        if (json.requiresEmailVerification) {
          onRequiresEmailVerification(otpEmail);
          setIsSubmitting(false);
          return;
        }

        if (!json.ok) {
          throw new Error(json.error ?? "Invalid or expired code");
        }

        if (json.isAdmin && json.requiresTwoFASetup) {
          router.push("/auth/2fa/setup");
          return;
        }

        if (json.isAdmin && json.requiresTwoFAChallenge) {
          router.push("/auth/2fa/challenge");
          return;
        }

        router.push(json.isAdmin ? "/admin" : "/");
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!otpEmail || otpStage !== "verify" || isSendingResend || resendCooldown > 0) {
      return;
    }

    setError(null);
    setInfoMessage(null);
    setIsSendingResend(true);
    setResendError(null);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Could not resend code");
      }

      setInfoMessage("We’ve sent you a new code.");
      setResendSent(true);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message ?? "Could not resend code.");
      setResendError(err.message ?? "Could not resend code.");
    } finally {
      setIsSendingResend(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-500">
          Real Deal Kickz
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Sign in with a one-time code
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          We’ll email you a short code. No password needed.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {infoMessage && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">
          {infoMessage}
        </div>
      )}

      <div className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="otp-email"
            className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200"
          >
            Email
          </label>
          <input
            id="otp-email"
            name="otp-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={otpEmail}
            onChange={(e) => setOtpEmail(e.target.value)}
            disabled={otpStage === "verify"}
            className="h-11 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-900 dark:text-neutral-50 shadow-sm disabled:opacity-60"
          />
        </div>

        {/* Code input */}
        {otpStage === "verify" && (
          <CodeInputWithResend
            id="otp-code"
            label="One-time code"
            value={otpCode}
            onChange={setOtpCode}
            onResend={handleResend}
            isSending={isSendingResend}
            cooldown={resendCooldown}
            disabled={isSubmitting}
            resendSent={resendSent}
            resendError={resendError}
            placeholder="123456"
          />
        )}
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg hover:from-red-500 hover:to-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting
            ? otpStage === "request"
              ? "Sending code..."
              : "Signing you in..."
            : otpStage === "request"
            ? "Send code"
            : "Verify code & sign in"}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onBackToPassword}
            className="text-xs sm:text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50 underline underline-offset-2"
          >
            Back to password sign in
          </button>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-center text-neutral-600 dark:text-neutral-300">
        Don’t have an account?{" "}
        <Link
          href="/auth/register"
          className="font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
