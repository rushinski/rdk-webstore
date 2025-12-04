// app/auth/verify-email/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AuthCard from "../../components/ui/AuthCard";

type Flow = "signup" | "signin";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const email = (params.get("email") ?? "").trim();
  const flow = (params.get("flow") as Flow) || "signup";

  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function sendVerificationEmail(mode: "auto" | "manual") {
    if (!email || isSending) return;

    try {
      setIsSending(true);
      if (mode === "manual") setError(null);

      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, flow }),
      });

      const json = await res.json();

      if (!json.ok) {
        if (mode === "manual") setError(json.error);
        return;
      }
      
      if (mode === "manual") {
        setSent(true);
        setCooldown(60); // Manual only
      }

    } finally {
      setIsSending(false);
    }
  }

  // Manual resend handler
  async function handleResend() {
    await sendVerificationEmail("manual");
  }

  // Auto-resend ONCE per email+flow per browser session.
  useEffect(() => {
    if (!email) return;

    if (flow === "signup") return;

    const auto = params.get("auto");
    if (auto !== "1") return; // Only auto-send on intentional redirect

    const key = `rdk:auto:${email}:${flow}`;
    const alreadySent = sessionStorage.getItem(key);
    if (alreadySent) return;  // Prevent duplicate sends in same session view

    sessionStorage.setItem(key, "true");

    void sendVerificationEmail("auto");
  }, [email, flow]);

  // Copy variants
  const heading =
    flow === "signin"
      ? "Verify your email to continue"
      : "Welcome! Activate your account";

  const description =
    flow === "signin"
      ? "Your email is not verified. We’ve sent you a fresh verification link. If you don’t see it, you can resend it using the button below."
      : "We’ve sent a verification link to your email. If you don’t see it within a minute, you can resend it using the button below.";

  const buttonLabel = (() => {
    if (isSending) return "Sending…";
    if (cooldown > 0) return `Resend in ${cooldown}s`;
    return "Resend verification email";
  })();

  const disableButton = isSending || cooldown > 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-red-700 via-black to-neutral-900 px-4 py-10 sm:px-6 lg:px-10">
        {/* Background haze */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-red-500/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-red-900/50 blur-3xl" />

        <div className="relative z-10 w-full max-w-md">
          <AuthCard className="bg-black/80 border border-white/10">
            <div className="space-y-6 text-center">
              {/* Brand badge */}
              <div className="inline-flex items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-400">
                Real Deal Kickz
              </div>

              {/* Heading */}
              <h1 className="text-xl sm:text-2xl font-semibold text-white">
                {heading}
              </h1>

              {/* Flow-based description */}
              <p className="text-xs sm:text-sm text-neutral-300 leading-snug">
                {description}
              </p>

              {/* Email */}
              <p className="font-medium text-sm sm:text-base text-neutral-50 break-all">
                {email || "Unknown email"}
              </p>

              {/* Resend button */}
              <button
                type="button"
                onClick={handleResend}
                disabled={disableButton}
                className={`inline-flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all
                  ${
                    disableButton
                      ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30"
                  }`}
              >
                {buttonLabel}
              </button>

              {/* Success/Error Messages */}
              <div className="min-h-[16px] mt-1">
                {sent && (
                  <p className="text-xs text-green-400">
                    Verification email resent.
                  </p>
                )}
                {error && <p className="text-xs text-red-400">{error}</p>}
              </div>
            </div>
          </AuthCard>
        </div>
      </div>
    </div>
  );
}
