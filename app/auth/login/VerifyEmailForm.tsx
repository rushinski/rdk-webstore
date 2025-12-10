"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SplitCodeInputWithResend } from "./SplitCodeInputWithResend";

type VerifyFlow = "signup" | "signin";

export interface VerifyEmailFormProps {
  email: string;
  flow?: VerifyFlow;              // default: "signin"
  onVerified?: (nextPath?: string) => void; // optional override
}

export function VerifyEmailForm({
  email,
  flow = "signin",
  onVerified,
}: VerifyEmailFormProps) {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isSendingResend, setIsSendingResend] = useState(false);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const heading =
    flow === "signin"
      ? "Verify your email to continue"
      : "Welcome! Activate your account";

  const description =
    flow === "signin"
      ? "Your email isn’t verified yet. We’ve sent you a verification email. You can click the link or enter the code below."
      : "We’ve sent a verification email to your address. Click the link or enter the code below to activate your account.";

  async function handleResend() {
    if (!email || isSendingResend || resendCooldown > 0) return;

    try {
      setIsSendingResend(true);
      setResendError(null);

      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, flow }),
      });

      const json = await res.json();
      if (!json.ok) {
        setResendError(json.error ?? "Could not resend email.");
        return;
      }

      setResendSent(true);
      setResendCooldown(60);
    } finally {
      setIsSendingResend(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !code) return;

    setError(null);
    setIsVerifying(true);

    try {
      const res = await fetch("/api/auth/verify-email/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          flow,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        setError(json.error ?? "Could not verify code.");
        return;
      }

      const nextPath = json.nextPath || "/";
      if (onVerified) {
        onVerified(nextPath);
      } else {
        router.push(nextPath);
      }
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-500">
          Real Deal Kickz
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          {heading}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      </div>

      {/* Email display */}
      <p className="text-center font-medium text-sm sm:text-base text-neutral-800 dark:text-neutral-100 break-all">
        {email || "Unknown email"}
      </p>

      {/* Divider */}
      <div className="flex items-center gap-3 text-[11px] text-neutral-400">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
        <span>Enter your code</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
      </div>

      {/* Code entry + inline resend */}
      <form onSubmit={handleVerifyCode} className="space-y-4">
      <SplitCodeInputWithResend
        id="verify-code"
        label="Verification code"
        length={6}
        value={code}
        onChange={setCode}
        onResend={handleResend}
        isSending={isSendingResend}
        cooldown={resendCooldown}
        disabled={isVerifying}
        resendSent={resendSent}
        resendError={resendError}
      />

      <button
        type="submit"
        disabled={isVerifying}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg hover:from-red-500 hover:to-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {isVerifying ? "Verifying..." : "Verify & continue"}
      </button>

      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
    </form>

      
    </div>
  );
}
