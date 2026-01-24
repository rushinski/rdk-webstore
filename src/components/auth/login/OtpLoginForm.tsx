// src/components/auth/login/OtpLoginForm.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { authStyles } from "@/components/auth/ui/AuthStyles";

import { EmailCodeFlow } from "./EmailCodeFlow";

interface OtpLoginFormProps {
  onRequiresEmailVerification: (email: string) => void;
  onBackToLogin?: () => void;
}

export function OtpLoginForm({
  onRequiresEmailVerification,
  onBackToLogin,
}: OtpLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/";

  async function requestOtp(email: string) {
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? "Error sending verification email.");
    }
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

    if (!json.ok) {
      throw new Error(json.error ?? "Invalid or expired code");
    }

    if (json.isAdmin && json.requiresTwoFASetup) {
      return router.push("/auth/2fa/setup");
    }
    if (json.isAdmin && json.requiresTwoFAChallenge) {
      return router.push("/auth/2fa/challenge");
    }

    // Redirect to where they came from or admin/home
    const destination = json.isAdmin ? "/admin" : nextUrl;
    router.push(destination);
  }

  return (
    <div className="space-y-4">
      <EmailCodeFlow
        flowId="otp-login"
        title="Sign in with code"
        codeLabel="Verification code"
        getDescription={(stage) =>
          stage === "request"
            ? "We'll email you a code. No password needed."
            : "Enter the code we sent to your email."
        }
        sendButtonLabel="Send code"
        sendButtonSendingLabel="Sending..."
        verifyButtonLabel="Sign in"
        verifyButtonSubmittingLabel="Signing in..."
        onRequestCode={requestOtp}
        onVerifyCode={verifyOtp}
      />

      <div className="flex justify-start">
        {onBackToLogin ? (
          <button
            type="button"
            onClick={onBackToLogin}
            className={authStyles.neutralLink}
          >
            Back to sign in
          </button>
        ) : (
          <Link
            href={`/auth/login${nextUrl !== "/" ? `?next=${encodeURIComponent(nextUrl)}` : ""}`}
            className={authStyles.neutralLink}
          >
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
