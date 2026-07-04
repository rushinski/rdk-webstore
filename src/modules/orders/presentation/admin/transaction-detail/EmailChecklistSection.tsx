import { CheckCircle, Clock, RefreshCw, XCircle } from "lucide-react";

import { SectionCard } from "@/modules/orders/presentation/admin/transaction-detail/transactionDetailShared";

import type { EmailLog } from "@/modules/orders/presentation/admin/transaction-detail/types";

type EmailChecklistSectionProps = {
  checklistTypes: readonly string[];
  emailLogs: EmailLog[];
  isPickup: boolean;
  resendingEmail: string | null;
  onPreview: (log: EmailLog) => void;
  onResend: (emailType: string) => void;
  getEmailTypeMeta: (type: string) => { label: string };
  fmtDate: (iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
};

export function EmailChecklistSection({
  checklistTypes,
  emailLogs,
  isPickup,
  resendingEmail,
  onPreview,
  onResend,
  getEmailTypeMeta,
  fmtDate,
}: EmailChecklistSectionProps) {
  return (
    <SectionCard title="Email Checklist">
      <p className="-mt-2 mb-4 text-xs text-brand-muted">
        {isPickup ? "Pickup order" : "Shipping order"} - Expected emails
      </p>
      <div className="space-y-0">
        {checklistTypes.map((emailType) => {
          const meta = getEmailTypeMeta(emailType);
          const matchingLogs = emailLogs.filter((log) => log.email_type === emailType);
          const latestLog =
            matchingLogs.length > 0
              ? [...matchingLogs].sort(
                  (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
                )[0]
              : null;

          const statusEl = latestLog ? (
            latestLog.delivery_status === "delivered" ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle className="h-3 w-3" /> Delivered
              </span>
            ) : latestLog.delivery_status === "failed" ? (
              <span className="inline-flex items-center gap-1 text-xs text-red-400">
                <XCircle className="h-3 w-3" /> Failed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-brand-muted">
                <Clock className="h-3 w-3" /> Sent
              </span>
            )
          ) : (
            <span className="text-xs text-brand-muted">Not sent</span>
          );

          const isResending = resendingEmail === emailType;

          return (
            <div
              key={emailType}
              className="flex items-center justify-between gap-4 border-b border-brand-border py-3 last:border-0"
            >
              <div>
                <p className="text-sm text-brand-text">{meta.label}</p>
                {latestLog && (
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {fmtDate(latestLog.sent_at, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                <div className="mt-0.5">{statusEl}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {latestLog?.html_snapshot && (
                  <button
                    type="button"
                    onClick={() => onPreview(latestLog)}
                    className="text-xs text-brand-muted transition-colors hover:text-brand-text"
                  >
                    View
                  </button>
                )}
                {latestLog && (
                  <button
                    type="button"
                    onClick={() => onResend(emailType)}
                    disabled={isResending || Boolean(resendingEmail)}
                    className="flex items-center gap-1 text-xs text-red-400 transition-colors hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${isResending ? "animate-spin" : ""}`}
                    />
                    {isResending ? "Sending..." : "Resend"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
