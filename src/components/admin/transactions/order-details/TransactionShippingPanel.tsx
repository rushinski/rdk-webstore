import { ExternalLink, Truck } from "lucide-react";

import { DetailRow, SectionCard } from "./transactionDetailShared";
import type { Order, OrderShipping, TrackingEvent } from "./types";

type TransactionShippingPanelProps = {
  fmtDate: (iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
  order: Order;
  shippingAddr: OrderShipping | null;
  trackingEvents: TrackingEvent[];
};

export function TransactionShippingPanel({
  fmtDate,
  order,
  shippingAddr,
  trackingEvents,
}: TransactionShippingPanelProps) {
  return (
    <SectionCard title="Shipping">
      <div className="space-y-0">
        {shippingAddr ? (
          <>
            <DetailRow label="Recipient">{shippingAddr.name ?? "-"}</DetailRow>
            {shippingAddr.phone && (
              <DetailRow label="Phone">{shippingAddr.phone}</DetailRow>
            )}
            <DetailRow label="Address">
              {[
                shippingAddr.line1,
                shippingAddr.line2,
                shippingAddr.city,
                shippingAddr.state,
                shippingAddr.postal_code,
                shippingAddr.country,
              ]
                .filter(Boolean)
                .join(", ") || "-"}
            </DetailRow>
          </>
        ) : (
          <>
            <DetailRow label="Recipient">-</DetailRow>
            <DetailRow label="Address">Missing shipping address</DetailRow>
          </>
        )}
        <DetailRow label="Carrier">{order.shipping_carrier ?? "-"}</DetailRow>
        <DetailRow label="Tracking #">{order.tracking_number ?? "-"}</DetailRow>
        {order.label_created_at && (
          <DetailRow label="Label created">{fmtDate(order.label_created_at)}</DetailRow>
        )}
        {order.label_url && (
          <DetailRow label="Label">
            <a
              href={order.label_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
            >
              Download <ExternalLink className="h-3 w-3" />
            </a>
          </DetailRow>
        )}
      </div>
      {trackingEvents.length > 0 && (
        <div className="mt-4">
          <p className="mb-3 text-xs uppercase tracking-widest text-brand-muted">
            Tracking Events
          </p>
          <ol className="space-y-3">
            {trackingEvents.map((event) => (
              <li key={event.id} className="flex items-start gap-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand-muted" />
                <div>
                  <p className="text-sm capitalize text-brand-text">
                    {event.status.replace(/_/g, " ")}
                  </p>
                  {event.description && (
                    <p className="text-xs text-brand-muted">{event.description}</p>
                  )}
                  {event.location && (
                    <p className="text-xs text-brand-muted">{event.location}</p>
                  )}
                  <p className="mt-0.5 text-xs text-brand-muted">
                    {fmtDate(event.event_timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </SectionCard>
  );
}
