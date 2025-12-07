"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SplitCodeInput } from "./SplitCodeInput";
import { PasswordField } from "../register/components/PasswordField";
import {
  PasswordRequirements,
  evaluateRequirements,
} from "../components/PasswordRequirements";

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

      if (!res.ok || !json.ok) {
        // Do NOT leak whether the email exists; show generic error
        throw new Error(json.error ?? "Could not send reset code.");
      }

      setInfoMessage(
        "If an account exists for that email, we’ve sent a reset code."
      );
      setStep("reset");
    } catch (err: any) {
      setError(err?.message ?? "Could not send reset code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!code || code.length < 4) {
      setError("Please enter the reset code from your email.");
      return;
    }

    // Use the same rules as PasswordRequirements
    const req = evaluateRequirements(password);
    if (!req.minLength || !req.hasLetter || !req.hasNumberOrSymbol || !req.notRepeatedChar) {
      setError("Password does not meet the required criteria.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1) Verify the reset code (Supabase recovery OTP)
      const verifyRes = await fetch("/api/auth/forgot-password/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
        }),
      });

      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || !verifyJson.ok) {
        throw new Error(verifyJson.error ?? "Invalid or expired code.");
      }

      // 2) Update password now that the recovery context is active
      const updateRes = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const updateJson = await updateRes.json();
      if (!updateRes.ok || !updateJson.ok) {
        throw new Error(updateJson.error ?? "Password update failed.");
      }

      setInfoMessage("Your password has been updated. You can now sign in.");
      router.push("/auth/login");
    } catch (err: any) {
      setError(err?.message ?? "Reset failed. Please try again.");
    } finally {
      setIsSubmitting(false);
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
          {step === "request" ? "Forgot your password?" : "Reset your password"}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          {step === "request"
            ? "Enter your email and we’ll send you a reset code."
            : "Enter the code from your email and choose a new password."}
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
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-900 dark:text-neutral-50 shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg hover:from-red-500 hover:to-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? "Sending code..." : "Send reset code"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-xs sm:text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50 underline underline-offset-2"
            >
              Back to sign in
            </button>
          </div>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={handleResetSubmit} className="space-y-4">
          {/* Email display (read-only) */}
          <p className="text-center text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 break-all">
            Resetting password for{" "}
            <span className="font-medium">{email}</span>
          </p>

          {/* Code input */}
          <div className="space-y-1.5">
            <label
              htmlFor="reset-code"
              className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200 text-center"
            >
              Reset code
            </label>
            <SplitCodeInput
              length={6}
              value={code}
              onChange={setCode}
              disabled={isSubmitting}
            />
          </div>

          {/* New password + confirm */}
          <PasswordField
            name="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />

          {/* Live requirements under new password */}
          <PasswordRequirements password={password} />

          <PasswordField
            name="confirm-password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg hover:from-red-500 hover:to-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? "Updating password..." : "Update password"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-xs sm:text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50 underline underline-offset-2"
            >
              Back to sign in
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
