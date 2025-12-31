// src/components/auth/login/ForgotPasswordForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "./PasswordField";
import { PasswordRequirements } from "../register/PasswordRequirements";
import { isPasswordValid } from "@/lib/validation/password";
import { SplitCodeInputWithResend } from "./SplitCodeInputWithResend";
import { AuthStyles } from "@/components/auth/ui/AuthStyles";
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
  const [confirmPassword, setConfirmPassword] = useState("");

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

      if (!res.ok || !json.ok)
        throw new Error(json.error ?? "Could not send reset code.");

      setInfoMessage("If an account exists for that email, we've sent a reset code.");
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
      if (!res.ok || !json.ok)
        throw new Error(json.error ?? "Could not resend reset code.");

      setInfoMessage("We've sent you a new reset code.");
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

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isPasswordValid(password)) {
      setError("Password does not meet the required criteria.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Verify code (creates recovery session)
      const verifyRes = await fetch("/api/auth/forgot-password/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });

      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || !verifyJson.ok)
        throw new Error(verifyJson.error ?? "Invalid or expired code.");

      // Check if admin needs 2FA
      if (verifyJson.requiresTwoFASetup) {
        router.push("/auth/2fa/setup");
        return;
      }

      if (verifyJson.requiresTwoFAChallenge) {
        router.push("/auth/2fa/challenge");
        return;
      }

      // Update password
      const updateRes = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const updateJson = await updateRes.json();
      if (!updateRes.ok || !updateJson.ok)
        throw new Error(updateJson.error ?? "Password update failed.");

      setInfoMessage("Your password has been updated.");
      
      // Redirect to admin if they completed 2FA, otherwise to login
      setTimeout(() => {
        router.push("/auth/login");
      }, 1000);
    } catch (err: any) {
      setError(err?.message ?? "Reset failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <AuthHeader
        title={step === "request" ? "Reset password" : "Create new password"}
        description={
          step === "request"
            ? "Enter your email to receive a reset code."
            : "Enter the code from your email and choose a new password."
        }
      />

      {error && <div className={AuthStyles.errorBox}>{error}</div>}
      {infoMessage && <div className={AuthStyles.infoBox}>{infoMessage}</div>}

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
              className={AuthStyles.input}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={AuthStyles.primaryButton}
          >
            {isSubmitting ? "Sending code..." : "Send reset code"}
          </button>

          <div className="flex justify-start">
            <button
              type="button"
              onClick={onBackToLogin}
              className={AuthStyles.neutralLink}
            >
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
            <input
              id="reset-email"
              value={email}
              disabled
              className={AuthStyles.inputDisabled}
            />
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

          <PasswordField
            name="confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

          <PasswordRequirements password={password} />

          <button
            type="submit"
            disabled={isSubmitting}
            className={AuthStyles.primaryButton}
          >
            {isSubmitting ? "Updating password..." : "Update password"}
          </button>

          <div className="flex justify-start">
            <button
              type="button"
              onClick={onBackToLogin}
              className={AuthStyles.neutralLink}
            >
              Back to sign in
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
