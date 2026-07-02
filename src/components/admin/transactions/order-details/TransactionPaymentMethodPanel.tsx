import { DetailRow, SectionCard } from "./transactionDetailShared";
import type { PaymentTransaction } from "./types";

type TransactionPaymentMethodPanelProps = {
  getAvsLabel: (code: string | null | undefined) => { label: string; color: string };
  getCvvLabel: (code: string | null | undefined) => { label: string; color: string };
  paymentTx: PaymentTransaction | null;
};

export function TransactionPaymentMethodPanel({
  getAvsLabel,
  getCvvLabel,
  paymentTx,
}: TransactionPaymentMethodPanelProps) {
  return (
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
  );
}
