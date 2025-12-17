// src/components/auth/login/LoginFormRouter.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { PasswordLoginForm } from "./PasswordLoginForm";
import { OtpLoginForm } from "./OtpLoginForm";
import { VerifyEmailForm } from "./VerifyEmailForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

type Mode = "password" | "otp" | "verifyEmail" | "forgotPassword";
type VerifyFlow = "signup" | "signin";

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();

  // -----------------------------
  // Derive state from URL
  // Query scheme:
  //   /auth/login                          -> password login (default)
  //   /auth/login?flow=otp                 -> OTP login
  //   /auth/login?flow=verify-email
  //        &email=...&verifyFlow=...       -> verify email screen
  //   /auth/login?flow=forgot-password     -> forgot password flow
  // -----------------------------
  const flowParam = params.get("flow"); // "otp" | "verify-email" | "forgot-password" | null
  const emailParam = (params.get("email") ?? "").trim();
  const verifyFlowParam: VerifyFlow =
    params.get("verifyFlow") === "signup" ? "signup" : "signin";

  let mode: Mode = "password";
  if (flowParam === "otp") {
    mode = "otp";
  } else if (flowParam === "verify-email") {
    mode = "verifyEmail";
  } else if (flowParam === "forgot-password") {
    mode = "forgotPassword";
  }

  // -----------------------------
  // Helpers to update URL
  // -----------------------------

  function goToPassword() {
    const search = new URLSearchParams(Array.from(params.entries()));

    // Password mode is the default; clear flow-related params
    search.delete("flow");
    search.delete("email");
    search.delete("verifyFlow");

    const qs = search.toString();
    router.push(`/auth/login${qs ? `?${qs}` : ""}`);
  }

  function goToOtp() {
    const search = new URLSearchParams(Array.from(params.entries()));

    // OTP login is represented by flow=otp
    search.set("flow", "otp");
    // OTP view doesn't need verify-email context
    search.delete("email");
    search.delete("verifyFlow");

    const qs = search.toString();
    router.push(`/auth/login?${qs}`);
  }

  function goToVerifyEmail(email: string, flow: VerifyFlow = "signin") {
    const search = new URLSearchParams();

    // flow=verify-email&verifyFlow=signup|signin&email=...
    search.set("flow", "verify-email");
    search.set("verifyFlow", flow);
    search.set("email", email.trim());

    router.push(`/auth/login?${search.toString()}`);
  }

  function goToForgotPassword() {
    const search = new URLSearchParams();

    // Forgot password is represented by flow=forgot-password
    search.set("flow", "forgot-password");

    router.push(`/auth/login?${search.toString()}`);
  }

  // -----------------------------
  // Render based on mode
  // -----------------------------

  if (mode === "verifyEmail") {
    return <VerifyEmailForm email={emailParam} flow={verifyFlowParam} />;
  }

  if (mode === "otp") {
    return (
      <OtpLoginForm
        onRequiresEmailVerification={(email) => goToVerifyEmail(email, "signin")}
      />
    );
  }

  if (mode === "forgotPassword") {
    return <ForgotPasswordForm onBackToLogin={goToPassword} />;
  }

  // default: password mode
  return (
    <PasswordLoginForm
      onRequiresEmailVerification={(email) => goToVerifyEmail(email, "signin")}
      onSwitchToOtp={goToOtp}
      onForgotPassword={goToForgotPassword}
    />
  );
}
