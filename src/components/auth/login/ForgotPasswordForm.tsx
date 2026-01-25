// src/components/auth/login/ForgotPasswordForm.tsx
"use client";

import { useState, useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";

import { isPasswordValid } from "@/lib/validation/password";
import { authStyles } from "@/components/auth/ui/authStyles";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";

import { PasswordRequirements } from "../register/PasswordRequirements";
import { SplitCodeInputWithResend } from "./SplitCodeInputWithResend";
import { PasswordField } from "./PasswordField";

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

type Step = "request" | "reset";

type State = {
  step: Step;
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  infoMessage: string | null;
  error: string | null;
  resendCooldown: number;
  resendSent: boolean;
  resendError: string | null;
  isSendingResend: boolean;
};

type Action =
  | { type: "SET_EMAIL"; email: string }
  | { type: "SET_CODE"; code: string }
  | { type: "SET_PASSWORD"; password: string }
  | { type: "SET_CONFIRM_PASSWORD"; confirmPassword: string }
  | { type: "START_SUBMIT" }
  | { type: "ERROR"; error: string }
  | { type: "INFO"; message: string }
  | { type: "ADVANCE_TO_RESET" }
  | { type: "START_RESEND" }
  | { type: "RESEND_SUCCESS" }
  | { type: "RESEND_ERROR"; error: string }
  | { type: "TICK_COOLDOWN" }
  | { type: "RESET_SUCCESS" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_EMAIL":
      return { ...state, email: action.email };
    case "SET_CODE":
      return { ...state, code: action.code };
    case "SET_PASSWORD":
      return { ...state, password: action.password };
    case "SET_CONFIRM_PASSWORD":
      return { ...state, confirmPassword: action.confirmPassword };
    case "START_SUBMIT":
      return { ...state, isSubmitting: true, error: null, infoMessage: null };
    case "ERROR":
      return { ...state, isSubmitting: false, error: action.error };
    case "INFO":
      return { ...state, infoMessage: action.message };
    case "ADVANCE_TO_RESET":
      return {
        ...state,
        isSubmitting: false,
        step: "reset",
        resendCooldown: 60,
        resendSent: false,
        resendError: null,
      };
    case "START_RESEND":
      return { ...state, isSendingResend: true, error: null, infoMessage: null, resendError: null };
    case "RESEND_SUCCESS":
      return {
        ...state,
        isSendingResend: false,
        resendSent: true,
        resendCooldown: 60,
        infoMessage: "We've sent you a new reset code.",
      };
    case "RESEND_ERROR":
      return { ...state, isSendingResend: false, error: action.error, resendError: action.error };
    case "TICK_COOLDOWN":
      return { ...state, resendCooldown: Math.max(0, state.resendCooldown - 1) };
    case "RESET_SUCCESS":
      return { ...state, isSubmitting: false };
    default:
      return state;
  }
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    step: "request",
    email: "",
    code: "",
    password: "",
    confirmPassword: "",
    isSubmitting: false,
    infoMessage: null,
    error: null,
    resendCooldown: 0,
    resendSent: false,
    resendError: null,
    isSendingResend: false,
  });

  useEffect(() => {
    if (state.resendCooldown <= 0) return;
    const id = setTimeout(() => dispatch({ type: "TICK_COOLDOWN" }), 1000);
    return () => clearTimeout(id);
  }, [state.resendCooldown]);

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: "START_SUBMIT" });

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Could not send reset code.");
      }

      dispatch({ type: "INFO", message: "If an account exists for that email, we've sent a reset code." });
      dispatch({ type: "ADVANCE_TO_RESET" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not send reset code.";
      dispatch({ type: "ERROR", error: message });
    }
  }

  async function handleResendResetCode() {
    if (!state.email || state.step !== "reset" || state.isSendingResend || state.resendCooldown > 0) {
      return;
    }

    dispatch({ type: "START_RESEND" });

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Could not resend reset code.");
      }

      dispatch({ type: "RESEND_SUCCESS" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not resend reset code.";
      dispatch({ type: "RESEND_ERROR", error: message });
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!state.code || state.code.length !== 6) {
      dispatch({ type: "ERROR", error: "Please enter the 6-digit reset code from your email." });
      return;
    }

    if (state.password !== state.confirmPassword) {
      dispatch({ type: "ERROR", error: "Passwords do not match." });
      return;
    }

    if (!isPasswordValid(state.password)) {
      dispatch({ type: "ERROR", error: "Password does not meet the required criteria." });
      return;
    }

    dispatch({ type: "START_SUBMIT" });

    try {
      const verifyRes = await fetch("/api/auth/forgot-password/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email.trim(), code: state.code.trim() }),
      });

      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || !verifyJson.ok) {
        throw new Error(verifyJson.error ?? "Invalid or expired code.");
      }

      if (verifyJson.requiresTwoFASetup) {
        router.push("/auth/2fa/setup");
        return;
      }

      if (verifyJson.requiresTwoFAChallenge) {
        router.push("/auth/2fa/challenge");
        return;
      }

      const updateRes = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: state.password }),
      });

      const updateJson = await updateRes.json();
      if (!updateRes.ok || !updateJson.ok) {
        throw new Error(updateJson.error ?? "Password update failed.");
      }

      dispatch({ type: "INFO", message: "Your password has been updated." });
      dispatch({ type: "RESET_SUCCESS" });

      setTimeout(() => {
        router.push("/auth/login");
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Reset failed. Please try again.";
      dispatch({ type: "ERROR", error: message });
    }
  }

  return (
    <div className="space-y-5">
      <AuthHeader
        title={state.step === "request" ? "Reset password" : "Create new password"}
        description={
          state.step === "request"
            ? "Enter your email to receive a reset code."
            : "Enter the code from your email and choose a new password."
        }
      />

      {state.error && <div className={authStyles.errorBox}>{state.error}</div>}
      {state.infoMessage && <div className={authStyles.infoBox}>{state.infoMessage}</div>}

      {state.step === "request" && (
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="forgot-email" className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              value={state.email}
              onChange={(e) => dispatch({ type: "SET_EMAIL", email: e.target.value })}
              className={authStyles.input}
            />
          </div>

          <button type="submit" disabled={state.isSubmitting} className={authStyles.primaryButton}>
            {state.isSubmitting ? "Sending code..." : "Send reset code"}
          </button>

          <div className="flex justify-start">
            <button type="button" onClick={onBackToLogin} className={authStyles.neutralLink}>
              Back to sign in
            </button>
          </div>
        </form>
      )}

      {state.step === "reset" && (
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="reset-email" className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Email
            </label>
            <input id="reset-email" value={state.email} disabled className={authStyles.inputDisabled} />
          </div>

          <SplitCodeInputWithResend
            id="reset-code"
            label="Reset code"
            length={6}
            value={state.code}
            onChange={(code) => dispatch({ type: "SET_CODE", code })}
            onResend={() => void handleResendResetCode()}
            isSending={state.isSendingResend}
            cooldown={state.resendCooldown}
            disabled={state.isSubmitting}
            resendSent={state.resendSent}
            resendError={state.resendError}
          />

          <PasswordField
            name="new-password"
            label="New password"
            value={state.password}
            onChange={(password) => dispatch({ type: "SET_PASSWORD", password })}
            autoComplete="new-password"
          />

          <PasswordField
            name="confirm-password"
            label="Confirm password"
            value={state.confirmPassword}
            onChange={(confirmPassword) => dispatch({ type: "SET_CONFIRM_PASSWORD", confirmPassword })}
            autoComplete="new-password"
          />

          <PasswordRequirements password={state.password} />

          <button type="submit" disabled={state.isSubmitting} className={authStyles.primaryButton}>
            {state.isSubmitting ? "Updating password..." : "Update password"}
          </button>

          <div className="flex justify-start">
            <button type="button" onClick={onBackToLogin} className={authStyles.neutralLink}>
              Back to sign in
            </button>
          </div>
        </form>
      )}
    </div>
  );
}