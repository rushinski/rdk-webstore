import { TransactionCustomerPanel } from "@/modules/orders/presentation/admin/transaction-detail/TransactionCustomerPanel";
import { TransactionOrderDetailsPanel } from "@/modules/orders/presentation/admin/transaction-detail/TransactionOrderDetailsPanel";

import type {
  Order,
  OrderShipping,
  PaymentTransaction,
} from "@/modules/orders/presentation/admin/transaction-detail/types";

type TransactionSidebarProps = {
  order: Order;
  paymentTx: PaymentTransaction | null;
  statusLabel: string;
  isPickup: boolean;
  refundedCents: number;
  refundedAmount: number;
  customerSummary: {
    routeId: string;
    displayId: string;
    kind: "account" | "guest";
    name: string;
    email: string | null;
  } | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddr: OrderShipping | null;
  fmtDate: (iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => string;
  fmtMoney: (value: number | null | undefined) => string;
  getRiskBadge: (decision: string | null | undefined) => React.ReactNode;
  onOpenCustomer: (routeId: string) => void;
};

export function TransactionSidebar({
  order,
  paymentTx,
  statusLabel,
  isPickup,
  refundedCents,
  refundedAmount,
  customerSummary,
  customerName,
  customerEmail,
  customerPhone,
  shippingAddr,
  fmtDate,
  fmtMoney,
  getRiskBadge,
  onOpenCustomer,
}: TransactionSidebarProps) {
  return (
    <div className="space-y-6">
      <TransactionOrderDetailsPanel
        fmtDate={fmtDate}
        fmtMoney={fmtMoney}
        getRiskBadge={getRiskBadge}
        isPickup={isPickup}
        order={order}
        paymentTx={paymentTx}
        refundedAmount={refundedAmount}
        refundedCents={refundedCents}
        statusLabel={statusLabel}
      />

      <TransactionCustomerPanel
        customerEmail={customerEmail}
        customerName={customerName}
        customerPhone={customerPhone}
        customerSummary={customerSummary}
        isPickup={isPickup}
        onOpenCustomer={onOpenCustomer}
        orderUserId={order.user_id}
        paymentTx={paymentTx}
        shippingAddr={shippingAddr}
      />
    </div>
  );
}
