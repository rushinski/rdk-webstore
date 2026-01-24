// src/components/auth/register/RegisterForm.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { isPasswordValid } from "@/lib/validation/password";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { authStyles } from "@/components/auth/ui/authStyles";

import { SocialButton } from "../ui/SocialButton";
import { PasswordField } from "../login/PasswordField";

import { PasswordRequirements } from "./PasswordRequirements";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatesOptIn, setUpdatesOptIn] = useState(false);

  const nextUrl = searchParams.get("next") || "/";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const email = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");
    const confirmValue = String(formData.get("confirmPassword") ?? "");

    if (passwordValue !== confirmValue) {
      setError("Passwords do not match.");
      return;
    }

    if (!isPasswordValid(passwordValue)) {
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

      // Pass the next URL through to the verification flow
      const verifyUrl = `/auth/login?flow=verify-email&verifyFlow=signup&email=${encodeURIComponent(email)}${nextUrl !== "/" ? `&next=${encodeURIComponent(nextUrl)}` : ""}`;
      router.push(verifyUrl);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
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

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="space-y-6"
      >
        <AuthHeader
          title="Create account"
          description="Join thousands of verified buyers"
        />

        {error && <div className={authStyles.errorBox}>{error}</div>}

        <div className="space-y-3">
          <SocialButton provider="google" label="Continue with Google" />
        </div>

        <div className={authStyles.divider}>
          <div className={authStyles.dividerLine} />
          <span>or</span>
          <div className={authStyles.dividerLine} />
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

          <PasswordField
            name="confirmPassword"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />

          <PasswordRequirements password={password} />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={updatesOptIn}
            onChange={(e) => setUpdatesOptIn(e.target.checked)}
            className="rdk-checkbox mt-0.5"
          />
          <span className="text-sm text-zinc-400">
            Send me drop alerts and exclusive offers
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className={authStyles.primaryButton}
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-xs text-center text-zinc-600">
          By signing up, you agree to our{" "}
          <Link href="/legal/terms" className="underline hover:text-zinc-400">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline hover:text-zinc-400">
            Privacy Policy
          </Link>
        </p>

        <p className="text-sm text-center text-zinc-500">
          Already have an account?{" "}
          <Link
            href={`/auth/login${nextUrl !== "/" ? `?next=${encodeURIComponent(nextUrl)}` : ""}`}
            className={authStyles.inlineAccentLink}
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
