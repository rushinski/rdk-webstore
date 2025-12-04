"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AuthCard from "../../components/ui/AuthCard";

export default function VerifyEmailPage() {
  const params = useSearchParams();

  const email = params.get("email") ?? "";
  const flow = params.get("flow") ?? "signup";

  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const heading =
    flow === "login"
      ? "Verify your email to continue"
      : "Welcome! Just one more step";

  const description =
    flow === "login"
      ? "Your account isn’t active yet. We’ve sent a new verification link to:"
      : "Thanks for signing up! Activate your account using the link we just sent to:";

  async function resend() {
    setError("");

    if (!email) {
      setError("Enter a valid email.");
      return;
    }

    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    const json = await res.json();
    if (!json.ok) {
      setError(json.error);
    } else {
      setSent(true);
    }
  }

  // auto-send if we have email
  useEffect(() => {
    if (email) resend();
  }, [email]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 py-10">
      <AuthCard className="bg-white dark:bg-neutral-950">
        <div className="space-y-6 text-center">
          {/* Brand Badge */}
          <div className="inline-flex items-center justify-center rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-500">
            Real Deal Kickz
          </div>

          {/* Heading */}
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {heading}
          </h1>

          {/* Description */}
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-snug">
            {description}
          </p>

          {/* Email Display */}
          {email && (
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              {email}
            </p>
          )}

          {/* Status */}
          {sent && (
            <p className="text-green-500 text-sm">
              A new verification link has been sent.
            </p>
          )}

          {error && (
            <p className="text-red-500 text-sm">
              {error}
            </p>
          )}

          {/* Resend Button */}
          <button
            onClick={resend}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg shadow-red-500/30 hover:from-red-500 hover:to-red-500 transition-all"
          >
            Resend Verification Email
          </button>
        </div>
      </AuthCard>
    </div>
  );
}
