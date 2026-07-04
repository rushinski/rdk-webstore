import { PayloadBlock } from "@/modules/orders/presentation/admin/transaction-detail/transactionDetailShared";

import type { PaymentEvent } from "@/modules/orders/presentation/admin/transaction-detail/types";

type PaymentEventSummaryPanelProps = {
  eventLabel: string;
  fmtDate: (iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
  relatedLogCount: number;
  selectedPaymentEvent: PaymentEvent;
};

export function PaymentEventSummaryPanel({
  eventLabel,
  fmtDate,
  relatedLogCount,
  selectedPaymentEvent,
}: PaymentEventSummaryPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-brand-border bg-brand-page p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
            Event
          </p>
          <p className="mt-2 text-sm font-semibold text-brand-text">{eventLabel}</p>
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
          <p className="mt-2 text-sm font-semibold text-brand-text">{relatedLogCount}</p>
        </div>
      </div>

      <PayloadBlock label="Event data" payload={selectedPaymentEvent.event_data} />
    </div>
  );
}
