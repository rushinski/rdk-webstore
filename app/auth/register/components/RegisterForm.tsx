// app/auth/register/components/RegisterForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { SocialButton } from "../../components/SocialButton";
import { PasswordField } from "../components/PasswordField";
import {
  PasswordRequirements,
  evaluateRequirements,
} from "../../components/PasswordRequirements";
import { Checkbox } from "../../../components/Checkbox";

export function RegisterForm() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [password, setPassword] = useState("");
  const [updatesOptIn, setUpdatesOptIn] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const email = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");

    // Password requirement validation
    const req = evaluateRequirements(passwordValue);
    const allPass = Object.values(req).every(Boolean);

    if (!allPass) {
      setError("Password does not meet minimum requirements.");
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password: passwordValue, updatesOptIn }),
      });

      const json = await res.json();

      if (!json.ok) {
        setError(json.error ?? "Sign up failed");
        return;
      }

      router.push(`/auth/verify-email?flow=signup&email=${encodeURIComponent(email)}`);
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

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Social */}
      <div className="space-y-3">
        <SocialButton provider="google" label="Sign up with Google" />
        <SocialButton provider="facebook" label="Sign up with Facebook" />
        <SocialButton provider="apple" label="Sign up with Apple" />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-[11px] text-neutral-400">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
        <span>or sign up with email</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
      </div>

      {/* Email + Password */}
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
            className="h-11 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-900 dark:text-neutral-50 shadow-sm"
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

        {/* Always-visible password requirements */}
        <PasswordRequirements password={password} />
      </div>

      {/* Updates Checkbox */}
      <Checkbox
        name="updatesOptIn"
        checked={updatesOptIn}
        onChange={(e) => setUpdatesOptIn(e.currentTarget.checked)}
        label="Send me product updates, drop alerts, and store news."
      />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg shadow-red-500/30 hover:from-red-500 hover:to-red-500 disabled:opacity-60 transition-all"
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>

      {/* Terms */}
      <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 text-center leading-snug">
        By signing up, you agree to our{" "}
        <Link href="/legal/terms" className="font-medium underline underline-offset-2">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="font-medium underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>

      {/* Login Link */}
      <p className="text-xs sm:text-sm text-center text-neutral-600 dark:text-neutral-300">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-red-600 hover:text-red-500">
          Sign in
        </Link>
      </p>
    </form>
  );
}
