import { Terminal } from "lucide-react";

import { PayloadBlock } from "@/modules/orders/presentation/admin/transaction-detail/transactionDetailShared";

import type { CheckoutLog } from "@/modules/orders/presentation/admin/transaction-detail/types";

type PaymentEventRelatedLogsPanelProps = {
  fmtDate: (iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
  relatedCheckoutLogs: CheckoutLog[];
};

export function PaymentEventRelatedLogsPanel({
  fmtDate,
  relatedCheckoutLogs,
}: PaymentEventRelatedLogsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
          Related checkout logs
        </p>
        {relatedCheckoutLogs.length === 0 && (
          <span className="text-xs text-brand-muted">No related API logs found</span>
        )}
      </div>

      {relatedCheckoutLogs.map((log) => {
        const isError = log.http_status !== null && (log.http_status ?? 0) >= 400;
        const statusColor = isError ? "text-red-400" : "text-emerald-400";

        return (
          <div
            key={log.id}
            className="space-y-4 border border-brand-border bg-brand-page p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-brand-muted" />
                <div className="min-w-0">
                  <p className="text-sm text-brand-text">
                    {log.event_label ?? log.route}
                  </p>
                  <p className="mt-0.5 break-all font-mono text-xs text-brand-muted">
                    {log.method} {log.route}
                  </p>
                  {log.error_message && (
                    <p className="mt-1 text-xs text-red-400">{log.error_message}</p>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-semibold ${statusColor}`}>
                  {log.http_status ?? "-"}
                </p>
                <p className="text-xs text-brand-muted">
                  {log.duration_ms !== null && log.duration_ms !== undefined
                    ? `${log.duration_ms}ms`
                    : "-"}
                </p>
              </div>
            </div>
            <p className="text-xs text-brand-muted">{fmtDate(log.created_at)}</p>
            <PayloadBlock label="Request" payload={log.request_payload} />
            <PayloadBlock label="Response" payload={log.response_payload} />
          </div>
        );
      })}
    </div>
  );
}
