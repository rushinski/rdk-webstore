import { DetailRow, SectionCard } from "@/modules/orders/presentation/admin/transaction-detail/transactionDetailShared";

import type {
  OrderShipping,
  PaymentTransaction,
} from "@/modules/orders/presentation/admin/transaction-detail/types";

type TransactionCustomerPanelProps = {
  customerEmail: string | null;
  customerName: string;
  customerPhone: string | null;
  customerSummary: {
    routeId: string;
    displayId: string;
    kind: "account" | "guest";
    name: string;
    email: string | null;
  } | null;
  isPickup: boolean;
  onOpenCustomer: (routeId: string) => void;
  orderUserId: string | null | undefined;
  paymentTx: PaymentTransaction | null;
  shippingAddr: OrderShipping | null;
};

export function TransactionCustomerPanel({
  customerEmail,
  customerName,
  customerPhone,
  customerSummary,
  isPickup,
  onOpenCustomer,
  orderUserId,
  paymentTx,
  shippingAddr,
}: TransactionCustomerPanelProps) {
  return (
    <SectionCard title="Customer">
      <div className="space-y-0">
        {customerSummary && (
          <DetailRow label="Customer ID">
            <button
              type="button"
              onClick={() => onOpenCustomer(customerSummary.routeId)}
              className="font-mono text-xs text-red-400 transition hover:text-red-300"
            >
              {customerSummary.displayId}
            </button>
          </DetailRow>
        )}
        <DetailRow label="Name">{customerName}</DetailRow>
        <DetailRow label="Email">{customerEmail ?? "-"}</DetailRow>
        <DetailRow label="Phone">{customerPhone ?? "-"}</DetailRow>
        <DetailRow label="Checkout">
          {orderUserId ? "Registered customer" : "Guest checkout"}
        </DetailRow>
        {!isPickup && (
          <DetailRow label="Recipient">{shippingAddr?.name ?? customerName}</DetailRow>
        )}
        {paymentTx?.billing_name &&
          paymentTx.billing_name !== customerName &&
          paymentTx.billing_name !== shippingAddr?.name && (
            <DetailRow label="Billing name">{paymentTx.billing_name}</DetailRow>
          )}
      </div>
    </SectionCard>
  );
}
