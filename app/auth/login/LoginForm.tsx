// app/auth/login/LoginForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SocialButton } from "../components/SocialButton";
import { PasswordField } from "../register/components/PasswordField";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const json = await res.json();

    if (json.requiresEmailVerification) {
      router.push(
        `/auth/verify-email?flow=login&email=${encodeURIComponent(email)}&auto=1`,
      );
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          <Link
            href="/auth/one-time-code"
            className="text-xs sm:text-sm text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 underline underline-offset-2"
          >
            Sign in with a one-time code
          </Link>
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
