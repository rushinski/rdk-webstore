// app/auth/login/LoginForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SocialButton } from "../components/SocialButton";
import { PasswordField } from "../register/components/PasswordField";

type Mode = "password" | "otp" | "verifyEmail";
type OtpStage = "request" | "verify";
type VerifyFlow = "signup" | "signin";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [mode, setMode] = useState<Mode>("password");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password mode state
  const [password, setPassword] = useState("");

  // OTP mode state
  const [otpStage, setOtpStage] = useState<OtpStage>("request");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Verify-email mode state
  const [verifyEmailAddress, setVerifyEmailAddress] = useState("");
  const [verifyFlow, setVerifyFlow] = useState<VerifyFlow>("signin");
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verifyResendCooldown, setVerifyResendCooldown] = useState(0);
  const [verifyResendSent, setVerifyResendSent] = useState(false);
  const [verifyResendError, setVerifyResendError] = useState<string | null>(
    null,
  );
  const [verifyIsSending, setVerifyIsSending] = useState(false);

  // -------------------------------------------------
  // Initialize from query params (for signup redirect)
  // /auth/login?flow=verify-email&email=...&verifyFlow=signup|signin
  // -------------------------------------------------
  useEffect(() => {
    const flowParam = params.get("flow");
    if (flowParam === "verify-email") {
      const emailParam = (params.get("email") ?? "").trim();
      const vfParam = params.get("verifyFlow");
      const vf: VerifyFlow = vfParam === "signup" ? "signup" : "signin";

      setVerifyEmailAddress(emailParam);
      setVerifyFlow(vf);
      setMode("verifyEmail");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cooldown timer for resend in verify-email mode
  useEffect(() => {
    if (verifyResendCooldown <= 0) return;
    const id = setTimeout(
      () => setVerifyResendCooldown((c) => c - 1),
      1000,
    );
    return () => clearTimeout(id);
  }, [verifyResendCooldown]);

  // Helper: when backend says "requiresEmailVerification"
  function switchToVerifyEmail(email: string, flow: VerifyFlow = "signin") {
    setVerifyEmailAddress(email.trim());
    setVerifyFlow(flow);
    setVerifyResendCooldown(0);
    setVerifyResendSent(false);
    setVerifyResendError(null);
    setVerifyCode("");
    setError(null);
    setInfoMessage(null);
    setMode("verifyEmail");
  }

  // Helper: go back to password sign-in from either OTP or verify modes
  function switchToPassword() {
    setMode("password");
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(false);
  }

  // Helper: switch to OTP mode
  function switchToOtp() {
    setMode("otp");
    setOtpStage("request");
    setOtpCode("");
    setError(null);
    setInfoMessage(null);
  }

  // -------------------------
  // PASSWORD login handler
  // -------------------------
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();

    if (json.requiresEmailVerification) {
      // NEW: stay on login page, flip into verify-email mode
      switchToVerifyEmail(email, "signin");
      setIsSubmitting(false);
      return;
    }

    if (!json.ok) {
      setError(json.error ?? "Login failed");
      setIsSubmitting(false);
      return;
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

  // -------------------------
  // OTP login handler
  // -------------------------
  async function handleOtpSubmit(e: React.FormEvent) {
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
          "We’ve emailed you a one-time code. Enter it below to sign in.",
        );
      } else {
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: otpEmail, code: otpCode }),
        });

        const json = await res.json();

        if (json.requiresEmailVerification) {
          // OTP login + unverified email -> same verify-email view
          switchToVerifyEmail(otpEmail, "signin");
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

  // -------------------------
  // VERIFY-EMAIL: resend
  // -------------------------
  async function handleVerifyResend() {
    if (!verifyEmailAddress || verifyIsSending || verifyResendCooldown > 0) {
      return;
    }

    try {
      setVerifyIsSending(true);
      setVerifyResendError(null);

      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifyEmailAddress,
          flow: verifyFlow,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        setVerifyResendError(json.error ?? "Could not resend email.");
        return;
      }

      setVerifyResendSent(true);
      setVerifyResendCooldown(60);
    } finally {
      setVerifyIsSending(false);
    }
  }

  // -------------------------
  // VERIFY-EMAIL: verify numeric code
  // -------------------------
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyEmailAddress || !verifyCode) return;

    // reuse the shared error state
    setError(null);
    setIsVerifyingCode(true);

    try {
      const res = await fetch("/api/auth/verify-email/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifyEmailAddress,
          code: verifyCode,
          flow: verifyFlow,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        setError(json.error ?? "Could not verify code.");
        return;
      }

      const nextPath = json.nextPath || "/";
      router.push(nextPath);
    } finally {
      setIsVerifyingCode(false);
    }
  }

  const verifyHeading =
    verifyFlow === "signin"
      ? "Verify your email to continue"
      : "Welcome! Activate your account";

  const verifyDescription =
    verifyFlow === "signin"
      ? "Your email isn’t verified yet. We’ve sent you a verification email. You can click the link or enter the code below."
      : "We’ve sent a verification email to your address. Click the link or enter the code below to activate your account.";

  const verifyResendLabel = (() => {
    if (verifyIsSending) return "Sending…";
    if (verifyResendCooldown > 0) return `Resend in ${verifyResendCooldown}s`;
    return "Resend verification email";
  })();

  const verifyResendDisabled =
    verifyIsSending || verifyResendCooldown > 0 || !verifyEmailAddress;

  // =========================
  // VERIFY-EMAIL MODE
  // =========================
  if (mode === "verifyEmail") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-500">
            Real Deal Kickz
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {verifyHeading}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            {verifyDescription}
          </p>
        </div>

        {/* Email display */}
        <p className="text-center font-medium text-sm sm:text-base text-neutral-800 dark:text-neutral-100 break-all">
          {verifyEmailAddress || "Unknown email"}
        </p>

        {/* Resend button + messages */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleVerifyResend}
            disabled={verifyResendDisabled}
            className={`inline-flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all
              ${
                verifyResendDisabled
                  ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30"
              }`}
          >
            {verifyResendLabel}
          </button>

          <div className="min-h-[16px] text-center">
            {verifyResendSent && (
              <p className="text-xs text-emerald-500">
                Verification email resent.
              </p>
            )}
            {verifyResendError && (
              <p className="text-xs text-red-500">{verifyResendError}</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 text-[11px] text-neutral-400">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
          <span>or enter your code</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
        </div>

        {/* Code entry */}
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="verify-code"
              className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200"
            >
              Verification code
            </label>
            <input
              id="verify-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              placeholder="Enter the code from your email"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              className="h-11 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-900 dark:text-neutral-50 shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifyingCode}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg hover:from-red-500 hover:to-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {isVerifyingCode ? "Verifying..." : "Verify & continue"}
          </button>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={switchToPassword}
            className="text-xs sm:text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50 underline underline-offset-2"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // OTP MODE
  // =========================
  if (mode === "otp") {
    return (
      <form onSubmit={handleOtpSubmit} className="space-y-6">
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

          {/* Code input shown in verify stage */}
          {otpStage === "verify" && (
            <div className="space-y-1.5">
              <label
                htmlFor="otp-code"
                className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200"
              >
                One-time code
              </label>
              <input
                id="otp-code"
                name="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-900 dark:text-neutral-50 shadow-sm"
              />
            </div>
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

          {otpStage === "verify" && (
            <button
              type="button"
              onClick={async () => {
                // Lightweight resend
                setError(null);
                setInfoMessage(null);
                setIsSubmitting(true);
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
                } catch (err: any) {
                  setError(err.message ?? "Could not resend code.");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="w-full text-xs sm:text-sm text-neutral-600 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100 underline underline-offset-2"
            >
              Resend code
            </button>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={switchToPassword}
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

  // =========================
  // PASSWORD MODE (default)
  // =========================
  return (
    <form onSubmit={handlePasswordSubmit} className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-500">
          Real Deal Kickz
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Sign in to your account
        </h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Social buttons */}
      <div className="space-y-3">
        <SocialButton
          provider="google"
          label="Sign in with Google"
          onClick={() => console.warn("Google sign-in not implemented yet")}
        />
        <SocialButton
          provider="facebook"
          label="Sign in with Facebook"
          onClick={() => console.warn("Facebook sign-in not implemented yet")}
        />
        <SocialButton
          provider="apple"
          label="Sign in with Apple"
          onClick={() => console.warn("Apple sign-in not implemented yet")}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-[11px] text-neutral-400">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
        <span>or sign in with email</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
      </div>

      {/* Email & Password */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-900 dark:text-neutral-50 shadow-sm"
          />
        </div>

        <PasswordField
          name="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-xs text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 underline underline-offset-2"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      {/* Submit */}
      <div className="space-y-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg hover:from-red-500 hover:to-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={switchToOtp}
            className="text-xs sm:text-sm text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 underline underline-offset-2"
          >
            Sign in with a one-time code
          </button>
        </div>
      </div>

      {/* Switch to signup */}
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
