import { X, Terminal } from "lucide-react";

import { PayloadBlock } from "./transactionDetailShared";
import type { CheckoutLog, PaymentEvent } from "./types";

type PaymentEventDrawerProps = {
  selectedPaymentEvent: PaymentEvent | null;
  isVisible: boolean;
  relatedCheckoutLogs: CheckoutLog[];
  onClose: () => void;
  getEventMeta: (
    eventType: string,
    eventData: Record<string, unknown>,
  ) => { label: string };
  fmtDate: (iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
};

export function PaymentEventDrawer({
  selectedPaymentEvent,
  isVisible,
  relatedCheckoutLogs,
  onClose,
  getEventMeta,
  fmtDate,
}: PaymentEventDrawerProps) {
  if (!selectedPaymentEvent) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end overflow-hidden bg-brand-text/45 transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
      onClick={onClose}
    >
      <div
        className={`w-full rounded-t-2xl border-t border-brand-border bg-brand-surface shadow-2xl transition-transform duration-300 ease-out ${isVisible ? "translate-y-0" : "translate-y-full"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto flex max-h-[80vh] w-full max-w-7xl flex-col overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-brand-border px-6 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
                Activity details
              </p>
              <p className="mt-1 text-lg font-semibold text-brand-text">
                {
                  getEventMeta(
                    selectedPaymentEvent.event_type,
                    selectedPaymentEvent.event_data,
                  ).label
                }
              </p>
              <p className="mt-1 text-sm text-brand-muted">
                {fmtDate(selectedPaymentEvent.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-brand-muted transition hover:text-brand-text"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="border border-brand-border bg-brand-page p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
                      Event
                    </p>
                    <p className="mt-2 text-sm font-semibold text-brand-text">
                      {
                        getEventMeta(
                          selectedPaymentEvent.event_type,
                          selectedPaymentEvent.event_data,
                        ).label
                      }
                    </p>
                  </div>
                  <div className="border border-brand-border bg-brand-page p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
                      Recorded
                    </p>
                    <p className="mt-2 text-sm font-semibold text-brand-text">
                      {fmtDate(selectedPaymentEvent.created_at)}
                    </p>
                  </div>
                  <div className="border border-brand-border bg-brand-page p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
                      Related logs
                    </p>
                    <p className="mt-2 text-sm font-semibold text-brand-text">
                      {relatedCheckoutLogs.length}
                    </p>
                  </div>
                </div>

                <PayloadBlock
                  label="Event data"
                  payload={selectedPaymentEvent.event_data}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
                    Related checkout logs
                  </p>
                  {relatedCheckoutLogs.length === 0 && (
                    <span className="text-xs text-brand-muted">
                      No related API logs found
                    </span>
                  )}
                </div>

                {relatedCheckoutLogs.map((log) => {
                  const isError =
                    log.http_status !== null && (log.http_status ?? 0) >= 400;
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
                              <p className="mt-1 text-xs text-red-400">
                                {log.error_message}
                              </p>
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
                      <p className="text-xs text-brand-muted">
                        {fmtDate(log.created_at)}
                      </p>
                      <PayloadBlock label="Request" payload={log.request_payload} />
                      <PayloadBlock label="Response" payload={log.response_payload} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
