import { PROCESSING_FEE_LABEL } from "@/lib/checkout/display-pricing";

import type { Order } from "./types";

type TransactionPriceBreakdownTotalsProps = {
  displayTotal: number;
  effectiveItemCost: number;
  fmtMoney: (value: number | null | undefined) => string;
  isOrderPlaced: boolean;
  order: Order;
  processingFee: number;
  refundedAmount: number;
  refundedCents: number;
  sellerRevenue: number;
  shipping: number;
  showOrderProfit: boolean;
  subtotal: number;
  tax: number;
  totalProfit: number;
};

export function TransactionPriceBreakdownTotals({
  displayTotal,
  effectiveItemCost,
  fmtMoney,
  isOrderPlaced,
  order,
  processingFee,
  refundedAmount,
  refundedCents,
  sellerRevenue,
  shipping,
  showOrderProfit,
  subtotal,
  tax,
  totalProfit,
}: TransactionPriceBreakdownTotalsProps) {
  return (
    <div className="grid gap-3 border-t border-brand-border pt-4 text-sm lg:grid-cols-2">
      <div className="space-y-2 border border-brand-border bg-brand-page p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
          Customer breakdown
        </p>
        <div className="flex justify-between text-brand-muted">
          <span>Subtotal</span>
          <span>{fmtMoney(subtotal)}</span>
        </div>
        {(shipping > 0 || order.fulfillment === "ship") && (
          <div className="flex justify-between text-brand-muted">
            <span>Shipping</span>
            <span>{fmtMoney(shipping)}</span>
          </div>
        )}
        {tax > 0 && (
          <div className="flex justify-between text-brand-muted">
            <span>Tax</span>
            <span>{fmtMoney(tax)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-brand-border pt-2 font-semibold text-brand-text">
          <span>Customer total</span>
          <span>{fmtMoney(displayTotal)}</span>
        </div>
      </div>

      <div className="space-y-2 border border-brand-border bg-brand-page p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
          Seller breakdown
        </p>
        {isOrderPlaced ? (
          <>
            <div className="flex justify-between text-red-400">
              <span>Processing fee ({PROCESSING_FEE_LABEL})</span>
              <span>-{fmtMoney(processingFee)}</span>
            </div>
            {refundedCents > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Refunded</span>
                <span>-{fmtMoney(refundedAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-brand-text">
              <span>Seller revenue</span>
              <span>{fmtMoney(sellerRevenue)}</span>
            </div>
            {showOrderProfit ? (
              <>
                <div className="flex justify-between text-red-400">
                  <span>Product cost</span>
                  <span>-{fmtMoney(effectiveItemCost)}</span>
                </div>
                <div className="flex justify-between border-t border-brand-border pt-2 font-semibold text-brand-text">
                  <span>Total profit</span>
                  <span
                    className={totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}
                  >
                    {totalProfit >= 0 ? "+" : ""}
                    {fmtMoney(totalProfit)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-brand-muted">
                <span>Seller total before cost</span>
                <span>{fmtMoney(sellerRevenue)}</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex justify-between text-brand-muted">
            <span>Order total before fee</span>
            <span>{fmtMoney(order.total)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
