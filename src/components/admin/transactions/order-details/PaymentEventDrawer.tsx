import { X } from "lucide-react";

import { PaymentEventRelatedLogsPanel } from "./PaymentEventRelatedLogsPanel";
import { PaymentEventSummaryPanel } from "./PaymentEventSummaryPanel";
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

  const eventLabel = getEventMeta(
    selectedPaymentEvent.event_type,
    selectedPaymentEvent.event_data,
  ).label;

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
              <p className="mt-1 text-lg font-semibold text-brand-text">{eventLabel}</p>
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
              <PaymentEventSummaryPanel
                eventLabel={eventLabel}
                fmtDate={fmtDate}
                relatedLogCount={relatedCheckoutLogs.length}
                selectedPaymentEvent={selectedPaymentEvent}
              />

              <PaymentEventRelatedLogsPanel
                fmtDate={fmtDate}
                relatedCheckoutLogs={relatedCheckoutLogs}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
