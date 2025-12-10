"use client";

import { useEffect, useState } from "react";
import { SplitCodeInputWithResend } from "./SplitCodeInputWithResend";

type Stage = "request" | "verify";

export interface EmailCodeFlowProps {
  // For debugging / test IDs only (optional)
  flowId?: string;

  // UI copy
  title: string;
  codeLabel: string;
  emailLabel?: string;

  /**
   * Returns the small subtitle text under the title.
   * You get the current stage and whether there's an error.
   */
  getDescription: (stage: Stage, hasError: boolean) => string;

  // Stage / email behaviour
  initialStage?: Stage;          // default: "request" if onRequestCode provided, otherwise "verify"
  initialEmail?: string;         // prefilled email (e.g. verify-email flow)
  emailReadOnly?: boolean;       // if true, show email as text instead of editable input
  showEmailInput?: boolean;      // default: true (ignored if emailReadOnly is true)

  // Button labels
  sendButtonLabel?: string;
  sendButtonSendingLabel?: string;
  verifyButtonLabel?: string;
  verifyButtonSubmittingLabel?: string;

  // Behaviour hooks
  onRequestCode?: (email: string) => Promise<void>;          // used in "request" stage
  onVerifyCode: (email: string, code: string) => Promise<void>;
  onResendCode?: (email: string) => Promise<void>;           // defaults to onRequestCode if not provided

  // Cooldown behaviour
  initialCooldown?: number;         // e.g. 60 for verify-email (already sent)
  codeLength?: number;              // default: 6
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

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const trimmedEmail = email.trim();
  const hasError = Boolean(error);
  const descriptionText = getDescription(stage, hasError);

  const canEditEmail = !emailReadOnly && showEmailInput;

  const effectiveResendHandler =
    onResendCode ?? onRequestCode ?? null;

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

        // Move to verify stage on success
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
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!effectiveResendHandler) return;
    if (!trimmedEmail || isSendingResend || resendCooldown > 0) return;

    setError(null);
    setResendError(null);
    setIsSendingResend(true);

    try {
      await effectiveResendHandler(trimmedEmail);
      setResendSent(true);
      setResendCooldown(60);
    } catch (err: any) {
      const message = err?.message ?? "Could not resend code.";
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
      onSubmit={handleSubmit}
      className="space-y-6"
      data-flow-id={flowId}
    >
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-500">
          Real Deal Kickz
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          {descriptionText}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Email input or read-only email */}
        {canEditEmail && (
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200"
            >
              {emailLabel}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={stage === "verify"}
              className="h-11 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-neutral-900 dark:text-neutral-50 shadow-sm disabled:opacity-60"
            />
          </div>
        )}

        {emailReadOnly && (
          <p className="text-center font-medium text-sm sm:text-base text-neutral-800 dark:text-neutral-100 break-all">
            {email || "Unknown email"}
          </p>
        )}

        {/* Code input only in verify stage */}
        {stage === "verify" && (
          <SplitCodeInputWithResend
            id="email-code"
            label={codeLabel}
            length={codeLength}
            value={code}
            onChange={setCode}
            onResend={handleResend}
            isSending={isSendingResend}
            cooldown={resendCooldown}
            disabled={isSubmitting}
            resendSent={resendSent}
            resendError={resendError}
          />
        )}
      </div>

      {/* Submit */}
      <div className="space-y-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-sm font-semibold text-white shadow-lg hover:from-red-500 hover:to-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
