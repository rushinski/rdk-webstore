// src/components/auth/login/OtpLoginForm.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmailCodeFlow } from "./EmailCodeFlow";
import { authStyles } from "@/components/auth/ui/authStyles";

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

      {/* Left-aligned back link, and remove the non-link “Don’t have an account?” text */}
      <div className="flex justify-start pt-1">
        {onBackToLogin ? (
          <button type="button" onClick={onBackToLogin} className={authStyles.neutralLink}>
            Back to sign in
          </button>
        ) : (
          <Link href="/auth/login" className={authStyles.neutralLink}>
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
