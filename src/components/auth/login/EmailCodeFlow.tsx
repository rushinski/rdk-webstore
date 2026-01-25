// src/components/auth/login/EmailCodeFlow.tsx
"use client";

import Link from "next/link";
import { useEffect, useReducer } from "react";

import { authStyles } from "@/components/auth/ui/authStyles";
import { AuthHeader } from "@/components/auth/ui/AuthHeader";
import { SplitCodeInputWithResend } from "./SplitCodeInputWithResend";

type Stage = "request" | "verify";

export interface EmailCodeFlowProps {
  flowId?: string;
  title: string;
  codeLabel: string;
  emailLabel?: string;
  getDescription: (stage: Stage, hasError: boolean) => string;
  initialStage?: Stage;
  initialEmail?: string;
  emailReadOnly?: boolean;
  showEmailInput?: boolean;
  sendButtonLabel?: string;
  sendButtonSendingLabel?: string;
  verifyButtonLabel?: string;
  verifyButtonSubmittingLabel?: string;
  onRequestCode?: (email: string) => Promise<void>;
  onVerifyCode: (email: string, code: string) => Promise<void>;
  onResendCode?: (email: string) => Promise<void>;
  initialCooldown?: number;
  codeLength?: number;
  backLabel?: string;
  backHref?: string;
  onBack?: () => void;
}

type State = {
  stage: Stage;
  email: string;
  code: string;
  error: string | null;
  isSubmitting: boolean;
  resendCooldown: number;
  resendSent: boolean;
  resendError: string | null;
  isSendingResend: boolean;
};

type Action =
  | { type: "SET_EMAIL"; email: string }
  | { type: "SET_CODE"; code: string }
  | { type: "START_SUBMIT" }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "ADVANCE_TO_VERIFY"; cooldown: number }
  | { type: "START_RESEND" }
  | { type: "RESEND_SUCCESS"; cooldown: number }
  | { type: "RESEND_ERROR"; error: string }
  | { type: "TICK_COOLDOWN" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_EMAIL":
      return { ...state, email: action.email };
    case "SET_CODE":
      return { ...state, code: action.code };
    case "START_SUBMIT":
      return { ...state, isSubmitting: true, error: null, resendError: null };
    case "SUBMIT_ERROR":
      return { ...state, isSubmitting: false, error: action.error };
    case "ADVANCE_TO_VERIFY":
      return {
        ...state,
        isSubmitting: false,
        stage: "verify",
        resendSent: false,
        resendError: null,
        resendCooldown: action.cooldown,
      };
    case "START_RESEND":
      return { ...state, isSendingResend: true, error: null, resendError: null };
    case "RESEND_SUCCESS":
      return {
        ...state,
        isSendingResend: false,
        resendSent: true,
        resendCooldown: action.cooldown,
      };
    case "RESEND_ERROR":
      return { ...state, isSendingResend: false, error: action.error, resendError: action.error };
    case "TICK_COOLDOWN":
      return { ...state, resendCooldown: Math.max(0, state.resendCooldown - 1) };
    default:
      return state;
  }
}

export function EmailCodeFlow({
  flowId,
  title,
  codeLabel,
  emailLabel = "Email",
  getDescription,
  initialStage,
  initialEmail,
  emailReadOnly,
  showEmailInput = true,
  sendButtonLabel = "Send code",
  sendButtonSendingLabel = "Sending code...",
  verifyButtonLabel = "Verify code",
  verifyButtonSubmittingLabel = "Verifying...",
  onRequestCode,
  onVerifyCode,
  onResendCode,
  initialCooldown = 0,
  codeLength = 6,
  backLabel,
  backHref,
  onBack,
}: EmailCodeFlowProps) {
  const [state, dispatch] = useReducer(reducer, {
    stage: initialStage ?? (onRequestCode ? "request" : "verify"),
    email: initialEmail ?? "",
    code: "",
    error: null,
    isSubmitting: false,
    resendCooldown: initialCooldown,
    resendSent: false,
    resendError: null,
    isSendingResend: false,
  });

  useEffect(() => {
    if (state.resendCooldown <= 0) return;
    const id = setTimeout(() => dispatch({ type: "TICK_COOLDOWN" }), 1000);
    return () => clearTimeout(id);
  }, [state.resendCooldown]);

  const trimmedEmail = state.email.trim();
  const hasError = Boolean(state.error);
  const descriptionText = getDescription(state.stage, hasError);
  const canShowEmailInput = !emailReadOnly && showEmailInput;
  const effectiveResendHandler = onResendCode ?? onRequestCode ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: "START_SUBMIT" });

    try {
      if (!trimmedEmail) {
        throw new Error("Email is required.");
      }

      if (state.stage === "request") {
        if (!onRequestCode) {
          throw new Error("Requesting a code is not supported for this flow.");
        }

        await onRequestCode(trimmedEmail);
        dispatch({ type: "ADVANCE_TO_VERIFY", cooldown: 60 });
      } else {
        if (!state.code || state.code.length !== codeLength) {
          throw new Error(`Please enter the ${codeLength}-digit code from your email.`);
        }

        await onVerifyCode(trimmedEmail, state.code.trim());
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      dispatch({ type: "SUBMIT_ERROR", error: message });
    }
  }

  async function handleResend() {
    if (!effectiveResendHandler || !trimmedEmail || state.isSendingResend || state.resendCooldown > 0) {
      return;
    }

    dispatch({ type: "START_RESEND" });

    try {
      await effectiveResendHandler(trimmedEmail);
      dispatch({ type: "RESEND_SUCCESS", cooldown: 60 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not resend code.";
      dispatch({ type: "RESEND_ERROR", error: message });
    }
  }

  const submitLabel =
    state.stage === "request"
      ? state.isSubmitting
        ? sendButtonSendingLabel
        : sendButtonLabel
      : state.isSubmitting
        ? verifyButtonSubmittingLabel
        : verifyButtonLabel;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-flow-id={flowId}>
      <AuthHeader title={title} description={descriptionText} />

      {state.error && <div className={authStyles.errorBox}>{state.error}</div>}

      <div className="space-y-4">
        {canShowEmailInput && (
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
              {emailLabel}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={state.email}
              onChange={(e) => dispatch({ type: "SET_EMAIL", email: e.target.value })}
              disabled={state.isSubmitting || state.stage === "verify"}
              className={state.stage === "verify" ? authStyles.inputDisabled : authStyles.input}
            />
          </div>
        )}

        {emailReadOnly && !canShowEmailInput && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
            {state.email || "Unknown email"}
          </div>
        )}

        {state.stage === "verify" && (
          <SplitCodeInputWithResend
            id="email-code"
            label={codeLabel}
            length={codeLength}
            value={state.code}
            onChange={(code) => dispatch({ type: "SET_CODE", code })}
            onResend={() => void handleResend()}
            isSending={state.isSendingResend}
            cooldown={state.resendCooldown}
            disabled={state.isSubmitting}
            resendSent={state.resendSent}
            resendError={state.resendError}
          />
        )}
      </div>

      <div className="space-y-3">
        <button type="submit" disabled={state.isSubmitting} className={authStyles.primaryButton}>
          {submitLabel}
        </button>

        {(backHref || onBack) && (
          <div className="flex justify-start">
            {backHref ? (
              <Link href={backHref} className={authStyles.neutralLink}>
                {backLabel ?? "Back"}
              </Link>
            ) : (
              <button type="button" onClick={onBack} className={authStyles.neutralLink}>
                {backLabel ?? "Back"}
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  );
}