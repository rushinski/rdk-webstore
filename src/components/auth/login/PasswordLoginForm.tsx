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
    <form onSubmit={handleSubmit} className="space-y-6">
      <AuthHeader title="Sign in" />

      {error && <div className={AuthStyles.errorBox}>{error}</div>}

      <div className="space-y-3">
        <SocialButton provider="google" label="Continue with Google" />
        <SocialButton provider="facebook" label="Continue with Facebook" />
      </div>

      <div className={AuthStyles.divider}>
        <div className={AuthStyles.dividerLine} />
        <span>or</span>
        <div className={AuthStyles.dividerLine} />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
              Password
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-red-500 hover:text-red-400 transition-colors"
            >
              Forgot?
            </button>
          </div>
          <PasswordField
            name="password"
            label=""
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className={AuthStyles.primaryButton}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <button
          type="button"
          onClick={onSwitchToOtp}
          className="w-full text-center text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Sign in with email code instead
        </button>
      </div>

      <p className="text-sm text-center text-zinc-400">
        Don't have an account?{" "}
        <Link href="/auth/register" className={AuthStyles.inlineAccentLink}>
          Create one
        </Link>
      </p>
    </form>
  );
}