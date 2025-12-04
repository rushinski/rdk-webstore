// app/auth/signup/SignupForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SocialButton } from "../../components/ui/SocialButton";
import { PasswordField } from "../../components/ui/PasswordField";
import { PasswordStrength, evaluatePassword } from "../../components/ui/PasswordStrength";
import { Checkbox } from "../../components/ui/Checkbox";

export function SignupForm() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatesOptIn, setUpdatesOptIn] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const email = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");
    const confirmPasswordValue = String(formData.get("confirmPassword") ?? "");

    // Client-side validation (confirm password)
    if (passwordValue !== confirmPasswordValue) {
      setError("Passwords do not match.");
      return;
    }

    // Password rules validation
    const { rules } = evaluatePassword(passwordValue);
    const allRulesPass = Object.values(rules).every(Boolean);

    if (!allRulesPass) {
      setError(
        "Password must be at least 8 characters and include an uppercase letter, a number, and a special character.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password: passwordValue, updatesOptIn }),
      });

      const json = await res.json();

      if (!json.ok) {
        setError(json.error ?? "Sign up failed");
        return;
      }

      router.push("/auth/verify-email");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-500">
          Real Deal Kickz
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Create your account
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Mobile-first. Built for resellers who move fast.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Social buttons */}
      <div className="space-y-3">
        <SocialButton
          provider="google"
          label="Sign up with Google"
          onClick={() => {
            // TODO: Hook up Supabase OAuth later
            console.warn("Google signup not implemented yet.");
          }}
        />
        <SocialButton
          provider="facebook"
          label="Sign up with Facebook"
          onClick={() => {
            console.warn("Facebook signup not implemented yet.");
          }}
        />
        <SocialButton
          provider="apple"
          label="Sign up with Apple"
          onClick={() => {
            console.warn("Apple signup not implemented yet.");
          }}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-[11px] text-neutral-400">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
        <span>or sign up with email</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
      </div>

      {/* Email + Password fields */}
      <div className="space-y-4">
        {/* Email */}
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
            className="h-11 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-900 dark:text-neutral-50 shadow-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
            placeholder="you@example.com"
          />
        </div>

        {/* Password */}
        <PasswordField
          name="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />

        {/* Confirm Password */}
        <PasswordField
          name="confirmPassword"
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />

        {/* Strength indicator */}
        <PasswordStrength password={password} />
      </div>

      {/* Updates checkbox */}
      <div>
        <Checkbox
          name="updatesOptIn"
          checked={updatesOptIn}
          onChange={(e) => setUpdatesOptIn(e.currentTarget.checked)}
          label="Send me product updates, drop alerts, and store news."
        />
      </div>

      {/* Submit button */}
      <div className="space-y-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg shadow-red-500/30 hover:from-red-500 hover:to-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        {/* Terms & Privacy */}
        <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 text-center leading-snug">
          By signing up, you agree to our{" "}
          <Link
            href="/legal/terms"
            className="font-medium text-neutral-800 dark:text-neutral-200 hover:text-red-500 dark:hover:text-red-400 underline underline-offset-2"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/privacy"
            className="font-medium text-neutral-800 dark:text-neutral-200 hover:text-red-500 dark:hover:text-red-400 underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {/* Sign in link */}
      <p className="text-xs sm:text-sm text-center text-neutral-600 dark:text-neutral-300">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
