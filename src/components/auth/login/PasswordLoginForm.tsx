// src/components/auth/login/PasswordLoginForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SocialButton } from "../ui/SocialButton";
import { PasswordField } from "./PasswordField";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { AuthStyles } from "@/components/auth/ui/AuthStyles";

interface PasswordLoginFormProps {
  onRequiresEmailVerification: (email: string) => void;
  onSwitchToOtp: () => void;
  onForgotPassword: () => void;
}

export function PasswordLoginForm({
  onRequiresEmailVerification,
  onSwitchToOtp,
  onForgotPassword,
}: PasswordLoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const email = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: passwordValue }),
      });

      const json = await res.json();

      if (json.requiresEmailVerification) {
        onRequiresEmailVerification(email);
        setIsSubmitting(false);
        return;
      }

      if (!json.ok) {
        setError(json.error ?? "Login failed");
        setIsSubmitting(false);
        return;
      }

      if (json.isAdmin && json.requiresTwoFASetup) return router.push("/auth/2fa/setup");
      if (json.isAdmin && json.requiresTwoFAChallenge)
        return router.push("/auth/2fa/challenge");

      router.push(json.isAdmin ? "/admin" : "/");
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AuthHeader title="Sign in to your account" />

      {error && <div className={AuthStyles.errorBox}>{error}</div>}

      <div className="space-y-3">
        <SocialButton provider="google" label="Sign in with Google" />
        <SocialButton provider="facebook" label="Sign in with Facebook" />
      </div>

      <div className="flex items-center gap-3 text-[11px] text-neutral-400">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300/70 dark:via-neutral-700/70 to-transparent" />
        <span>or sign in with email</span>
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
            className={AuthStyles.input}
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
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 underline underline-offset-2"
          >
            Forgot password?
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className={AuthStyles.primaryButton}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        {/* Keep centered, but revert to small link sizing */}
        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToOtp}
            className={`${AuthStyles.accentLink} text-xs sm:text-sm`}
          >
            Sign in with a one-time code
          </button>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-center text-neutral-600 dark:text-neutral-300">
        Don’t have an account?{" "}
        <Link href="/auth/register" className={AuthStyles.inlineAccentLink}>
          Create one
        </Link>
      </p>
    </form>
  );
}
