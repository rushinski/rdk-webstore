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

  const flowParam = params.get("flow");
  const emailParam = (params.get("email") ?? "").trim();
  const verifyFlowParam: VerifyFlow =
    params.get("verifyFlow") === "signup" ? "signup" : "signin";

  let mode: Mode = "password";
  if (flowParam === "otp") mode = "otp";
  else if (flowParam === "verify-email") mode = "verifyEmail";
  else if (flowParam === "forgot-password") mode = "forgotPassword";

  function goToPassword() {
    const search = new URLSearchParams(Array.from(params.entries()));
    search.delete("flow");
    search.delete("email");
    search.delete("verifyFlow");
    const qs = search.toString();
    router.push(`/auth/login${qs ? `?${qs}` : ""}`);
  }

  function goToOtp() {
    const search = new URLSearchParams(Array.from(params.entries()));
    search.set("flow", "otp");
    search.delete("email");
    search.delete("verifyFlow");
    const qs = search.toString();
    router.push(`/auth/login?${qs}`);
  }

  function goToVerifyEmail(email: string, flow: VerifyFlow = "signin") {
    const search = new URLSearchParams();
    search.set("flow", "verify-email");
    search.set("verifyFlow", flow);
    search.set("email", email.trim());
    router.push(`/auth/login?${search.toString()}`);
  }

  function goToForgotPassword() {
    const search = new URLSearchParams();
    search.set("flow", "forgot-password");
    router.push(`/auth/login?${search.toString()}`);
  }

  if (mode === "verifyEmail") {
    return (
      <VerifyEmailForm
        email={emailParam}
        flow={verifyFlowParam}
        onBackToLogin={goToPassword}
      />
    );
  }

  if (mode === "otp") {
    return (
      <OtpLoginForm
        onBackToLogin={goToPassword}
        onRequiresEmailVerification={(email) => goToVerifyEmail(email, "signin")}
      />
    );
  }

  if (mode === "forgotPassword") {
    return <ForgotPasswordForm onBackToLogin={goToPassword} />;
  }

  return (
    <PasswordLoginForm
      onRequiresEmailVerification={(email) => goToVerifyEmail(email, "signin")}
      onSwitchToOtp={goToOtp}
      onForgotPassword={goToForgotPassword}
    />
  );
}
