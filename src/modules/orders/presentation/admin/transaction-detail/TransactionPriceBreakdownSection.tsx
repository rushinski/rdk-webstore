import { TransactionPriceBreakdownItemList } from "@/modules/orders/presentation/admin/transaction-detail/TransactionPriceBreakdownItemList";
import { TransactionPriceBreakdownTotals } from "@/modules/orders/presentation/admin/transaction-detail/TransactionPriceBreakdownTotals";
import { SectionCard } from "@/modules/orders/presentation/admin/transaction-detail/transactionDetailShared";

import type { Order, OrderItem } from "@/modules/orders/presentation/admin/transaction-detail/types";

type TransactionPriceBreakdownSectionProps = {
  order: Order;
  items: OrderItem[];
  showPriceBreakdown: boolean;
  showOrderProfit: boolean;
  subtotal: number;
  shipping: number;
  tax: number;
  displayTotal: number;
  processingFee: number;
  refundedCents: number;
  refundedAmount: number;
  sellerRevenue: number;
  effectiveItemCost: number;
  totalProfit: number;
  isOrderPlaced: boolean;
  fmtMoney: (value: number | null | undefined) => string;
  onOpenItemModal: (item: OrderItem) => void;
  getOrderItemFinancials: (item: OrderItem) => {
    unitCost: number;
    quantity: number;
    unitProfit: number;
  };
};

export function TransactionPriceBreakdownSection({
  order,
  items,
  showPriceBreakdown,
  showOrderProfit,
  subtotal,
  shipping,
  tax,
  displayTotal,
  processingFee,
  refundedCents,
  refundedAmount,
  sellerRevenue,
  effectiveItemCost,
  totalProfit,
  isOrderPlaced,
  fmtMoney,
  onOpenItemModal,
  getOrderItemFinancials,
}: TransactionPriceBreakdownSectionProps) {
  return (
    <SectionCard title="Price Breakdown">
      {!showPriceBreakdown && (
        <p className="-mt-2 mb-4 text-xs text-brand-muted">
          Products from this checkout session are shown below. Pricing becomes final once
          checkout completes.
        </p>
      )}

      <TransactionPriceBreakdownItemList
        fmtMoney={fmtMoney}
        getOrderItemFinancials={getOrderItemFinancials}
        items={items}
        onOpenItemModal={onOpenItemModal}
        showOrderProfit={showOrderProfit}
        showPriceBreakdown={showPriceBreakdown}
      />

      {showPriceBreakdown && (
        <TransactionPriceBreakdownTotals
          displayTotal={displayTotal}
          effectiveItemCost={effectiveItemCost}
          fmtMoney={fmtMoney}
          isOrderPlaced={isOrderPlaced}
          order={order}
          processingFee={processingFee}
          refundedAmount={refundedAmount}
          refundedCents={refundedCents}
          sellerRevenue={sellerRevenue}
          shipping={shipping}
          showOrderProfit={showOrderProfit}
          subtotal={subtotal}
          tax={tax}
          totalProfit={totalProfit}
        />
      )}
    </SectionCard>
  );
}
