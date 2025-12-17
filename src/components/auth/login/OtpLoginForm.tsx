// src/components/auth/login/OtpLoginForm.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmailCodeFlow } from "./EmailCodeFlow";

interface OtpLoginFormProps {
  onRequiresEmailVerification: (email: string) => void;
}

export function OtpLoginForm({ onRequiresEmailVerification }: OtpLoginFormProps) {
  const router = useRouter();

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
      router.push("/auth/2fa/setup");
      return;
    }

    if (json.isAdmin && json.requiresTwoFAChallenge) {
      router.push("/auth/2fa/challenge");
      return;
    }

    router.push(json.isAdmin ? "/admin" : "/");
  }

  return (
    <div className="space-y-4">
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

      {/* Footer kept outside the form */}
      <p className="text-xs sm:text-sm text-center text-neutral-600 dark:text-neutral-300">
        Don’t have an account?{" "}
        <Link
          href="/auth/register"
          className="font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
