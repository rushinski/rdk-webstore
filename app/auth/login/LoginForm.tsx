"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PasswordLoginForm } from "./PasswordLoginForm";
import { OtpLoginForm } from "./OtpLoginForm";
import { VerifyEmailForm } from "./VerifyEmailForm";

type Mode = "password" | "otp" | "verifyEmail";
type VerifyFlow = "signup" | "signin";

interface VerifyContext {
  email: string;
  flow: VerifyFlow;
}

export function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("password");
  const [verifyContext, setVerifyContext] = useState<VerifyContext | null>(
    null
  );

  // Initialize from query params (signup redirect)
  // /auth/login?flow=verify-email&email=...&verifyFlow=signup|signin
  useEffect(() => {
    const flowParam = params.get("flow");
    if (flowParam === "verify-email") {
      const emailParam = (params.get("email") ?? "").trim();
      const vfParam = params.get("verifyFlow");
      const vf: VerifyFlow = vfParam === "signup" ? "signup" : "signin";

      setVerifyContext({ email: emailParam, flow: vf });
      setMode("verifyEmail");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRequiresEmailVerification(
    email: string,
    flow: VerifyFlow = "signin"
  ) {
    setVerifyContext({ email: email.trim(), flow });
    setMode("verifyEmail");
  }

  if (mode === "verifyEmail" && verifyContext) {
    return (
      <VerifyEmailForm
        email={verifyContext.email}
        flow={verifyContext.flow}
        onBack={() => setMode("password")}
      />
    );
  }

  if (mode === "otp") {
    return (
      <OtpLoginForm
        onBackToPassword={() => setMode("password")}
        onRequiresEmailVerification={(email) =>
          handleRequiresEmailVerification(email, "signin")
        }
      />
    );
  }

  // default: password mode
  return (
    <PasswordLoginForm
      onRequiresEmailVerification={(email) =>
        handleRequiresEmailVerification(email, "signin")
      }
      onSwitchToOtp={() => setMode("otp")}
    />
  );
}
