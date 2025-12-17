// src/components/auth/login/ForgotPasswordForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "./PasswordField";
import { PasswordRequirements, evaluateRequirements } from "../register/PasswordRequirements";
import { SplitCodeInputWithResend } from "./SplitCodeInputWithResend";
import { authStyles } from "@/components/auth/ui/authStyles";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

type Step = "request" | "reset";

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isSendingResend, setIsSendingResend] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not send reset code.");

      setInfoMessage("If an account exists for that email, we’ve sent a reset code.");
      setStep("reset");

      setResendSent(false);
      setResendError(null);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message ?? "Could not send reset code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendResetCode() {
    if (!email || step !== "reset" || isSendingResend || resendCooldown > 0) return;

    setError(null);
    setInfoMessage(null);
    setIsSendingResend(true);
    setResendError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Could not resend reset code.");

      setInfoMessage("We’ve sent you a new reset code.");
      setResendSent(true);
      setResendCooldown(60);
    } catch (err: any) {
      const message = err?.message ?? "Could not resend reset code.";
      setError(message);
      setResendError(message);
    } finally {
      setIsSendingResend(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!code || code.length !== 6) {
      setError("Please enter the 6-digit reset code from your email.");
      return;
    }

    const req = evaluateRequirements(password);
    if (!req.minLength || !req.hasLetter || !req.hasNumberOrSymbol || !req.notRepeatedChar) {
      setError("Password does not meet the required criteria.");
      return;
    }

    setIsSubmitting(true);

    try {
      const verifyRes = await fetch("/api/auth/forgot-password/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });

      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || !verifyJson.ok) throw new Error(verifyJson.error ?? "Invalid or expired code.");

      const updateRes = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const updateJson = await updateRes.json();
      if (!updateRes.ok || !updateJson.ok) throw new Error(updateJson.error ?? "Password update failed.");

      setInfoMessage("Your password has been updated. You can now sign in.");
      router.push("/auth/login");
    } catch (err: any) {
      setError(err?.message ?? "Reset failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <AuthHeader
        title={step === "request" ? "Forgot your password?" : "Reset your password"}
        description={
          step === "request"
            ? "Enter your email and we’ll send you a reset code."
            : "Enter the code from your email and choose a new password."
        }
      />

      {error && <div className={authStyles.errorBox}>{error}</div>}
      {infoMessage && <div className={authStyles.infoBox}>{infoMessage}</div>}

      {step === "request" && (
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="forgot-email"
              className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200"
            >
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authStyles.input}
            />
          </div>

          <button type="submit" disabled={isSubmitting} className={authStyles.primaryButton}>
            {isSubmitting ? "Sending code..." : "Send reset code"}
          </button>

          <div className="text-center">
            <button type="button" onClick={onBackToLogin} className={authStyles.neutralLink}>
              Back to sign in
            </button>
          </div>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="reset-email"
              className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200"
            >
              Email
            </label>
            <input id="reset-email" value={email} disabled className={authStyles.inputDisabled} />
          </div>

          <SplitCodeInputWithResend
            id="reset-code"
            label="Reset code"
            length={6}
            value={code}
            onChange={setCode}
            onResend={handleResendResetCode}
            isSending={isSendingResend}
            cooldown={resendCooldown}
            disabled={isSubmitting}
            resendSent={resendSent}
            resendError={resendError}
          />

          <PasswordField
            name="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />

          <PasswordRequirements password={password} />

          <button type="submit" disabled={isSubmitting} className={authStyles.primaryButton}>
            {isSubmitting ? "Updating password..." : "Update password"}
          </button>

          <div className="text-center">
            <button type="button" onClick={onBackToLogin} className={authStyles.neutralLink}>
              Back to sign in
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
