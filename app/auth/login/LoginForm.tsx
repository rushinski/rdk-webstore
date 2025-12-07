"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { PasswordLoginForm } from "./PasswordLoginForm";
import { OtpLoginForm } from "./OtpLoginForm";
import { VerifyEmailForm } from "./VerifyEmailForm";

type Mode = "password" | "otp" | "verifyEmail";
type VerifyFlow = "signup" | "signin";

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();

  // -----------------------------
  // Derive state from URL
  // Query scheme:
  //   /auth/login                       -> password login (default)
  //   /auth/login?flow=otp             -> OTP login
  //   /auth/login?flow=verify-email
  //        &email=...&verifyFlow=...   -> verify email screen
  // -----------------------------
  const flowParam = params.get("flow"); // "otp" | "verify-email" | null
  const emailParam = (params.get("email") ?? "").trim();
  const verifyFlowParam: VerifyFlow =
    params.get("verifyFlow") === "signup" ? "signup" : "signin";

  let mode: Mode = "password";
  if (flowParam === "otp") {
    mode = "otp";
  } else if (flowParam === "verify-email") {
    mode = "verifyEmail";
  }

  // -----------------------------
  // Helpers to update URL
  // -----------------------------

  function goToPassword() {
    const search = new URLSearchParams(Array.from(params.entries()));

    // Password mode is the default; we can clear the flow-related params
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

    // Reuse your existing pattern:
    // flow=verify-email&verifyFlow=signup|signin&email=...
    search.set("flow", "verify-email");
    search.set("verifyFlow", flow);
    search.set("email", email.trim());

    router.push(`/auth/login?${search.toString()}`);
  }

  // -----------------------------
  // Render based on mode
  // -----------------------------

  if (mode === "verifyEmail") {
    return (
      <VerifyEmailForm
        email={emailParam}
        flow={verifyFlowParam}
      />
    );
  }

  if (mode === "otp") {
    return (
      <OtpLoginForm
        onRequiresEmailVerification={(email) =>
          goToVerifyEmail(email, "signin")
        }
      />
    );
  }

  // default: password mode
  return (
    <PasswordLoginForm
      onRequiresEmailVerification={(email) =>
        goToVerifyEmail(email, "signin")
      }
      onSwitchToOtp={goToOtp}
    />
  );
}
