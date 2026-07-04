import { TransactionPaymentMethodPanel } from "@/modules/orders/presentation/admin/transaction-detail/TransactionPaymentMethodPanel";
import { TransactionShippingPanel } from "@/modules/orders/presentation/admin/transaction-detail/TransactionShippingPanel";

import type {
  Order,
  OrderShipping,
  PaymentTransaction,
  TrackingEvent,
} from "@/modules/orders/presentation/admin/transaction-detail/types";

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
        <TransactionShippingPanel
          fmtDate={fmtDate}
          order={order}
          shippingAddr={shippingAddr}
          trackingEvents={trackingEvents}
        />
      )}

      {paymentAttemptMade && (
        <TransactionPaymentMethodPanel
          getAvsLabel={getAvsLabel}
          getCvvLabel={getCvvLabel}
          paymentTx={paymentTx}
        />
      )}
    </>
  );
}
