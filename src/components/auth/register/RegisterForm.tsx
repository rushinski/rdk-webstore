// src/components/auth/register/RegisterForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { SocialButton } from "../ui/SocialButton";
import { PasswordField } from "../login/PasswordField";
import { PasswordRequirements, evaluateRequirements } from "./PasswordRequirements";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { AuthStyles } from "@/components/auth/ui/AuthStyles";

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <AuthHeader
        title="Create account"
        description="Join thousands of verified buyers."
      />

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

        <PasswordField
          name="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />

        <PasswordRequirements password={password} />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={updatesOptIn}
          onChange={(e) => setUpdatesOptIn(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-2 focus:ring-red-600/50 focus:ring-offset-0"
        />
        <span className="text-sm text-zinc-400">
          Send me drop alerts and exclusive offers
        </span>
      </label>

      <button type="submit" disabled={isSubmitting} className={AuthStyles.primaryButton}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>

      <p className="text-xs text-center text-zinc-500">
        By signing up, you agree to our{" "}
        <Link href="/legal/terms" className="underline hover:text-zinc-400">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="underline hover:text-zinc-400">
          Privacy Policy
        </Link>
      </p>

      <p className="text-sm text-center text-zinc-400">
        Already have an account?{" "}
        <Link href="/auth/login" className={AuthStyles.inlineAccentLink}>
          Sign in
        </Link>
      </p>
    </form>
  );
}