import { SectionCard } from "@/modules/orders/presentation/admin/transaction-detail/transactionDetailShared";

import type {
  EmailLog,
  SessionEntry,
} from "@/modules/orders/presentation/admin/transaction-detail/types";

type SessionActivitySectionProps = {
  sessionTimeline: SessionEntry[];
  onSelectPaymentEvent: (eventId: string) => void;
  onPreviewEmail: (log: EmailLog) => void;
  getEventMeta: (
    eventType: string,
    eventData: Record<string, unknown>,
  ) => { icon: React.ReactNode; label: string; description?: string };
  getEmailTypeMeta: (type: string) => { icon: React.ReactNode; label: string };
  fmtDate: (iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
};

export function SessionActivitySection({
  sessionTimeline,
  onSelectPaymentEvent,
  onPreviewEmail,
  getEventMeta,
  getEmailTypeMeta,
  fmtDate,
}: SessionActivitySectionProps) {
  return (
    <SectionCard title="Session Activity">
      {sessionTimeline.length === 0 ? (
        <p className="text-sm text-brand-muted">No activity recorded for this order.</p>
      ) : (
        <ol className="space-y-3">
          {sessionTimeline.map((entry) => {
            if (entry.kind === "payment") {
              const event = entry.data;
              const meta = getEventMeta(event.event_type, event.event_data);

              return (
                <li key={entry.id} className="border border-brand-border bg-brand-page">
                  <button
                    type="button"
                    onClick={() => onSelectPaymentEvent(event.id)}
                    className="w-full px-4 py-4 text-left transition hover:bg-brand-surface"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 shrink-0">{meta.icon}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-brand-text">{meta.label}</p>
                          {meta.description && (
                            <p className="mt-0.5 text-xs text-brand-muted">
                              {meta.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-brand-muted">
                            {fmtDate(event.created_at)}
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-xs text-brand-muted">View details</p>
                    </div>
                  </button>
                </li>
              );
            }

            const log = entry.data;
            const emailMeta = getEmailTypeMeta(log.email_type);
            const deliveryColor =
              log.delivery_status === "delivered"
                ? "text-emerald-400"
                : log.delivery_status === "failed"
                  ? "text-red-400"
                  : "text-brand-muted";

            return (
              <li key={entry.id} className="border border-brand-border bg-brand-page p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{emailMeta.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-brand-text">{emailMeta.label}</p>
                    <p className="text-xs text-brand-muted">To: {log.recipient_email}</p>
                    <p className="mt-0.5 text-xs text-brand-muted">
                      Sent{" "}
                      {fmtDate(log.sent_at, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    {log.delivered_at && (
                      <p className="text-xs text-brand-muted">
                        Delivered{" "}
                        {fmtDate(log.delivered_at, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    {log.opened_at && (
                      <p className="text-xs text-emerald-500">
                        Opened{" "}
                        {fmtDate(log.opened_at, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    <span className={`text-xs capitalize ${deliveryColor}`}>
                      {log.delivery_status}
                    </span>
                  </div>
                  <div className="shrink-0">
                    {log.html_snapshot && (
                      <button
                        type="button"
                        onClick={() => onPreviewEmail(log)}
                        className="text-xs text-brand-muted transition-colors hover:text-brand-text"
                      >
                        View details
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}
