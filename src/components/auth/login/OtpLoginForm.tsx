// src/components/auth/login/OtpLoginForm.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmailCodeFlow } from "./EmailCodeFlow";

interface OtpLoginFormProps {
  onRequiresEmailVerification: (email: string) => void;
  onBackToLogin?: () => void;
}

export function OtpLoginForm({ onRequiresEmailVerification, onBackToLogin }: OtpLoginFormProps) {
  const router = useRouter();

  async function requestOtp(email: string) {
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error ?? "Error sending verification email.");
  }

  async function verifyOtp(email: string, code: string) {
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const json = await res.json();

    if (json.requiresEmailVerification) {
      onRequiresEmailVerification(email);
      return;
    }

    if (!json.ok) throw new Error(json.error ?? "Invalid or expired code");

    if (json.isAdmin && json.requiresTwoFASetup) return router.push("/auth/2fa/setup");
    if (json.isAdmin && json.requiresTwoFAChallenge) return router.push("/auth/2fa/challenge");

    router.push(json.isAdmin ? "/admin" : "/");
  }

  return (
    <div className="space-y-3">
      <EmailCodeFlow
        flowId="otp-login"
        title="Sign in with a one-time code"
        codeLabel="One-time code"
        getDescription={(stage, hasError) =>
          stage === "request"
            ? hasError
              ? "Error sending verification email. Please try again."
              : "We’ll email you a short code. No password needed."
            : "We’ve emailed you a one-time code. Enter it below to sign in."
        }
        sendButtonLabel="Send code"
        sendButtonSendingLabel="Sending code..."
        verifyButtonLabel="Verify code & sign in"
        verifyButtonSubmittingLabel="Signing you in..."
        onRequestCode={requestOtp}
        onVerifyCode={verifyOtp}
      />

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        {onBackToLogin ? (
          <button type="button" onClick={onBackToLogin} className="text-xs sm:text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50 underline underline-offset-2">
            Back to sign in
          </button>
        ) : (
          <Link href="/auth/login" className="text-xs sm:text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50 underline underline-offset-2">
            Back to sign in
          </Link>
        )}

        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 sm:text-right">
          Don’t have an account?
        </p>
      </div>
    </div>
  );
}
