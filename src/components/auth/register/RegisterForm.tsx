// src/components/auth/register/RegisterForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { SocialButton } from "../ui/SocialButton";
import { PasswordField } from "../login/PasswordField";
import { PasswordRequirements, evaluateRequirements } from "./PasswordRequirements";
import { Checkbox } from "../ui/Checkbox";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { authStyles } from "@/components/auth/ui/authStyles";

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

      router.push(
        `/auth/login?flow=verify-email&verifyFlow=signup&email=${encodeURIComponent(email)}`,
      );
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AuthHeader title="Create your account" description="Mobile-first. Built for resellers who move fast." />

      {error && <div className={authStyles.errorBox}>{error}</div>}

      <div className="space-y-3">
        <SocialButton provider="google" label="Sign up with Google" />
        <SocialButton provider="facebook" label="Sign up with Facebook" />
      </div>

      <div className="flex items-center gap-3 text-[11px] text-neutral-400">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
        <span>or sign up with email</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
      </div>

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
            className={authStyles.input}
          />
        </div>

        <PasswordField
          name="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />

        <PasswordRequirements password={password} />
      </div>

      <Checkbox
        name="updatesOptIn"
        checked={updatesOptIn}
        onChange={(e) => setUpdatesOptIn(e.currentTarget.checked)}
        label="Send me product updates, drop alerts, and store news."
      />

      <button type="submit" disabled={isSubmitting} className={authStyles.primaryButton}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>

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

      <p className="text-xs sm:text-sm text-center text-neutral-600 dark:text-neutral-300">
        Already have an account?{" "}
        <Link href="/auth/login" className={authStyles.inlineAccentLink}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
