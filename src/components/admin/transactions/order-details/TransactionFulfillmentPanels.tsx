import { ExternalLink, Truck } from "lucide-react";

import { DetailRow, SectionCard } from "./transactionDetailShared";
import type { Order, OrderShipping, PaymentTransaction, TrackingEvent } from "./types";

type TransactionFulfillmentPanelsProps = {
  order: Order;
  shippingAddr: OrderShipping | null;
  trackingEvents: TrackingEvent[];
  paymentAttemptMade: boolean;
  paymentTx: PaymentTransaction | null;
  fmtDate: (iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
  getCvvLabel: (code: string | null | undefined) => { label: string; color: string };
  getAvsLabel: (code: string | null | undefined) => { label: string; color: string };
};

export function TransactionFulfillmentPanels({
  order,
  shippingAddr,
  trackingEvents,
  paymentAttemptMade,
  paymentTx,
  fmtDate,
  getCvvLabel,
  getAvsLabel,
}: TransactionFulfillmentPanelsProps) {
  return (
    <>
      {order.fulfillment === "ship" && (
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
              <DetailRow label="Label created">
                {fmtDate(order.label_created_at)}
              </DetailRow>
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
      )}

      {paymentAttemptMade && (
        <SectionCard title="Payment Method">
          {!paymentTx ? (
            <p className="text-sm text-brand-muted">
              No payment data available for this order.
            </p>
          ) : (
            <div className="space-y-0">
              <DetailRow label="Card type">{paymentTx.card_type ?? "-"}</DetailRow>
              <DetailRow label="Last 4">
                {paymentTx.card_last4 ? `.... ${paymentTx.card_last4}` : "-"}
              </DetailRow>
              <DetailRow label="Expires">
                {paymentTx.card_expiry_month && paymentTx.card_expiry_year
                  ? `${String(paymentTx.card_expiry_month).padStart(2, "0")} / ${paymentTx.card_expiry_year}`
                  : "-"}
              </DetailRow>
              <DetailRow label="Cardholder">{paymentTx.billing_name ?? "-"}</DetailRow>
              <DetailRow label="CVV check">
                <span className={getCvvLabel(paymentTx.cvv2_result_code).color}>
                  {getCvvLabel(paymentTx.cvv2_result_code).label}
                </span>
              </DetailRow>
              <DetailRow label="AVS result">
                <span className={getAvsLabel(paymentTx.avs_result_code).color}>
                  {getAvsLabel(paymentTx.avs_result_code).label}
                </span>
              </DetailRow>
              {paymentTx.three_ds_status && (
                <DetailRow label="3D Secure">{paymentTx.three_ds_status}</DetailRow>
              )}
              <DetailRow label="Billing address">
                {[
                  paymentTx.billing_address,
                  paymentTx.billing_city,
                  paymentTx.billing_state,
                  paymentTx.billing_zip,
                  paymentTx.billing_country,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </DetailRow>
            </div>
          )}
        </SectionCard>
      )}
    </>
  );
}
