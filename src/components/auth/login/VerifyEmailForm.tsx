// src/components/auth/login/VerifyEmailForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { EmailCodeFlow } from "./EmailCodeFlow";

type VerifyFlow = "signup" | "signin";

export interface VerifyEmailFormProps {
  email: string;
  flow?: VerifyFlow;
  onVerified?: (nextPath?: string) => void;
  onBackToLogin?: () => void; // styling/navigation only
}

export function VerifyEmailForm({
  email,
  flow = "signin",
  onVerified,
  onBackToLogin,
}: VerifyEmailFormProps) {
  const router = useRouter();

  const heading =
    flow === "signin" ? "Verify your email to continue" : "Welcome! Activate your account";

  const baseDescriptionSignin =
    "Your email isn’t verified yet. Enter the code we sent to continue.";
  const baseDescriptionSignup = "Enter the code we emailed to activate your account.";

  async function resendVerification(targetEmail: string) {
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, flow }),
    });

    const json = await res.json();
    if (!json.ok) {
      throw new Error(json.error ?? "Could not resend verification email.");
    }
  }

  async function verifyCode(targetEmail: string, code: string) {
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: targetEmail.trim(),
        code: code.trim(),
        flow,
      }),
    });

    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.error ?? "Could not verify code.");
    }

    const nextPath = json.nextPath || "/";
    if (onVerified) onVerified(nextPath);
    else router.push(nextPath);
  }

  return (
    <EmailCodeFlow
      flowId="verify-email"
      title={heading}
      codeLabel="Verification code"
      emailLabel="Email"
      initialStage="verify"
      initialEmail={email}
      showEmailInput={true}
      getDescription={(_stage, hasError) =>
        hasError
          ? "That code didn’t work. Double-check the digits or request a new one."
          : flow === "signin"
            ? baseDescriptionSignin
            : baseDescriptionSignup
      }
      verifyButtonLabel="Verify & continue"
      verifyButtonSubmittingLabel="Verifying..."
      onVerifyCode={verifyCode}
      onResendCode={resendVerification}
      initialCooldown={60}
      codeLength={6}
      backLabel="Back to sign in"
      onBack={onBackToLogin}
      backHref={onBackToLogin ? undefined : "/auth/login"}
    />
  );
}
