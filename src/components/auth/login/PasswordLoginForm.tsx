// src/components/auth/login/PasswordLoginForm.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { AuthStyles } from "@/components/auth/ui/AuthStyles";

import { SocialButton } from "../ui/SocialButton";

import { PasswordField } from "./PasswordField";

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
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextUrl = searchParams.get("next") || "/";

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

      if (json.isAdmin && json.requiresTwoFASetup) {
        return router.push("/auth/2fa/setup");
      }
      if (json.isAdmin && json.requiresTwoFAChallenge) {
        return router.push("/auth/2fa/challenge");
      }

      // Redirect to where they came from or admin/home
      const destination = json.isAdmin ? "/admin" : nextUrl;
      router.push(destination);
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back to shopping link */}
      <Link
        href={nextUrl}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to shopping
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6">
        <AuthHeader title="Sign in" />

        {error && <div className={AuthStyles.errorBox}>{error}</div>}

        <div className="space-y-3">
          <SocialButton provider="google" label="Continue with Google" />
        </div>

        <div className={AuthStyles.divider}>
          <div className={AuthStyles.dividerLine} />
          <span>or</span>
          <div className={AuthStyles.dividerLine} />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-white">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={AuthStyles.input}
              data-testid="login-email"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-white">
                Password
              </label>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-red-600 hover:text-red-500 transition-colors"
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
              dataTestId="login-password"
            />
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className={AuthStyles.primaryButton}
            data-testid="login-submit"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            onClick={onSwitchToOtp}
            className="w-full text-center text-sm text-zinc-500 hover:text-white transition-colors"
          >
            Sign in with email code instead
          </button>
        </div>

        <p className="text-sm text-center text-zinc-500">
          Don't have an account?{" "}
          <Link
            href={`/auth/register${nextUrl !== "/" ? `?next=${encodeURIComponent(nextUrl)}` : ""}`}
            className={AuthStyles.inlineAccentLink}
          >
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
