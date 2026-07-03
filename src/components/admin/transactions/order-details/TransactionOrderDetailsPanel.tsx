import { DetailRow, SectionCard } from "./transactionDetailShared";
import type { Order, PaymentTransaction } from "./types";

type TransactionOrderDetailsPanelProps = {
  fmtDate: (iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
  fmtMoney: (value: number | null | undefined) => string;
  getRiskBadge: (decision: string | null | undefined) => React.ReactNode;
  isPickup: boolean;
  order: Order;
  paymentTx: PaymentTransaction | null;
  refundedAmount: number;
  refundedCents: number;
  statusLabel: string;
};

export function TransactionOrderDetailsPanel({
  fmtDate,
  fmtMoney,
  getRiskBadge,
  isPickup,
  order,
  paymentTx,
  refundedAmount,
  refundedCents,
  statusLabel,
}: TransactionOrderDetailsPanelProps) {
  return (
    <SectionCard title="Details">
      <div className="space-y-0">
        <DetailRow label="Order #">
          <span className="font-mono">#{order.id.slice(0, 8)}</span>
        </DetailRow>
        <DetailRow label="Status">{statusLabel}</DetailRow>
        <DetailRow label="Fulfillment">{isPickup ? "Pickup" : "Shipping"}</DetailRow>
        <DetailRow label="Created">{fmtDate(order.created_at)}</DetailRow>
        <DetailRow label="Updated">{fmtDate(order.updated_at)}</DetailRow>
        {paymentTx?.paymentStatus && (
          <DetailRow label="Payment status">{paymentTx.paymentStatus}</DetailRow>
        )}
        {paymentTx?.processorReference !== null &&
          paymentTx?.processorReference !== undefined && (
            <DetailRow label="Processor reference">
              {paymentTx.processorReference}
            </DetailRow>
          )}
        {paymentTx?.id && (
          <DetailRow label="Payment ID">
            <span className="font-mono text-xs">{paymentTx.id}</span>
          </DetailRow>
        )}
        {paymentTx?.amount_authorized !== null &&
          paymentTx?.amount_authorized !== undefined && (
            <DetailRow label="Amount authorized">
              {fmtMoney(paymentTx.amount_authorized)}
            </DetailRow>
          )}
        {paymentTx?.amount_captured !== null &&
          paymentTx?.amount_captured !== undefined && (
            <DetailRow label="Amount captured">
              {fmtMoney(paymentTx.amount_captured)}
            </DetailRow>
          )}
        {paymentTx?.authorizationCode && (
          <DetailRow label="Authorization code">{paymentTx.authorizationCode}</DetailRow>
        )}
        {paymentTx && (
          <DetailRow label="Risk review">
            {getRiskBadge(paymentTx.riskDecision)}
          </DetailRow>
        )}
        {paymentTx?.riskReviewId && (
          <DetailRow label="Risk review ID">{paymentTx.riskReviewId}</DetailRow>
        )}
        {paymentTx?.customer_ip && (
          <DetailRow label="Customer IP">{paymentTx.customer_ip}</DetailRow>
        )}
        {refundedCents > 0 && (
          <DetailRow label="Refunded">
            {fmtMoney(refundedAmount)}
            {order.refunded_at ? ` · ${fmtDate(order.refunded_at)}` : ""}
          </DetailRow>
        )}
        {order.shipping_carrier && (
          <DetailRow label="Carrier">{order.shipping_carrier}</DetailRow>
        )}
        {order.tracking_number && (
          <DetailRow label="Tracking #">{order.tracking_number}</DetailRow>
        )}
        {order.failure_reason && (
          <DetailRow label="Failure reason">{order.failure_reason}</DetailRow>
        )}
      </div>
    </SectionCard>
  );
}
