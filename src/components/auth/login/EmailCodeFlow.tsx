// src/components/auth/login/EmailCodeFlow.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { authStyles } from "@/components/auth/ui/AuthStyles";
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
  const [stage, setStage] = useState<Stage>(
    initialStage ?? (onRequestCode ? "request" : "verify"),
  );

  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(initialCooldown);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isSendingResend, setIsSendingResend] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const trimmedEmail = email.trim();
  const hasError = Boolean(error);
  const descriptionText = getDescription(stage, hasError);

  const canShowEmailInput = !emailReadOnly && showEmailInput;
  const effectiveResendHandler = onResendCode ?? onRequestCode ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResendError(null);
    setIsSubmitting(true);

    try {
      if (!trimmedEmail) {
        throw new Error("Email is required.");
      }

      if (stage === "request") {
        if (!onRequestCode) {
          throw new Error("Requesting a code is not supported for this flow.");
        }

        await onRequestCode(trimmedEmail);

        setStage("verify");
        setResendSent(false);
        setResendError(null);
        setResendCooldown(60);
      } else {
        if (!code || code.length !== codeLength) {
          throw new Error(`Please enter the ${codeLength}-digit code from your email.`);
        }

        await onVerifyCode(trimmedEmail, code.trim());
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!effectiveResendHandler) {
      return;
    }
    if (!trimmedEmail || isSendingResend || resendCooldown > 0) {
      return;
    }

    setError(null);
    setResendError(null);
    setIsSendingResend(true);

    try {
      await effectiveResendHandler(trimmedEmail);
      setResendSent(true);
      setResendCooldown(60);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not resend code.";
      setError(message);
      setResendError(message);
    } finally {
      setIsSendingResend(false);
    }
  }

  const submitLabel =
    stage === "request"
      ? isSubmitting
        ? sendButtonSendingLabel
        : sendButtonLabel
      : isSubmitting
        ? verifyButtonSubmittingLabel
        : verifyButtonLabel;

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="space-y-6"
      data-flow-id={flowId}
    >
      <AuthHeader title={title} description={descriptionText} />

      {error && <div className={authStyles.errorBox}>{error}</div>}

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting || stage === "verify"}
              className={stage === "verify" ? authStyles.inputDisabled : authStyles.input}
            />
          </div>
        )}

        {emailReadOnly && !canShowEmailInput && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400">
            {email || "Unknown email"}
          </div>
        )}

        {stage === "verify" && (
          <SplitCodeInputWithResend
            id="email-code"
            label={codeLabel}
            length={codeLength}
            value={code}
            onChange={setCode}
            onResend={() => {
              void handleResend();
            }}
            isSending={isSendingResend}
            cooldown={resendCooldown}
            disabled={isSubmitting}
            resendSent={resendSent}
            resendError={resendError}
          />
        )}
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className={authStyles.primaryButton}
        >
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
