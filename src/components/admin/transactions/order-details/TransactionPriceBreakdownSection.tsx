import { PROCESSING_FEE_LABEL } from "@/lib/checkout/display-pricing";

import { SectionCard } from "./transactionDetailShared";
import type { Order, OrderItem } from "./types";

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

      {items.length === 0 ? (
        <p className="text-sm text-brand-muted">
          No products were recorded for this order.
        </p>
      ) : (
        <div className="space-y-0">
          {items.map((item) => {
            const title = item.product_name ?? item.product?.name ?? "Item";
            const imageUrl =
              item.product?.images?.find((image) => image.is_primary)?.url ??
              item.product?.images?.[0]?.url ??
              "/images/rdk-logo.png";
            const isRefunded = Boolean(item.refunded_at);
            const showItemProfit = showOrderProfit && !isRefunded;
            const financials = getOrderItemFinancials(item);
            const itemCost = financials.unitCost * financials.quantity;
            const itemProfit = financials.unitProfit * financials.quantity;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenItemModal(item)}
                className={`group -mx-2 flex w-full items-start gap-4 border border-transparent px-2 py-3 text-left transition-colors hover:border-brand-border hover:bg-brand-page ${isRefunded ? "opacity-50" : ""}`}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden border border-brand-border bg-brand-page">
                  <img
                    src={imageUrl}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-brand-text">{title}</p>
                  <p className="text-xs text-brand-muted">
                    {(item.size_label ?? item.variant?.size_label)
                      ? `Size ${item.size_label ?? item.variant?.size_label} · `
                      : ""}
                    Qty {item.quantity}
                    {isRefunded ? " · Refunded" : ""}
                  </p>
                  {showPriceBreakdown ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="border border-brand-border bg-brand-page p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
                          Customer paid
                        </p>
                        <p className="mt-1 text-sm font-semibold text-brand-text">
                          {fmtMoney(item.line_total)}
                        </p>
                      </div>
                      <div className="border border-brand-border bg-brand-page p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
                          Product cost
                        </p>
                        <p className="mt-1 text-sm font-semibold text-brand-text">
                          {fmtMoney(itemCost)}
                        </p>
                      </div>
                      {showItemProfit && (
                        <div className="border border-brand-border bg-brand-page p-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
                            Profit
                          </p>
                          <p
                            className={`mt-1 text-sm font-semibold ${itemProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {itemProfit >= 0 ? "+" : ""}
                            {fmtMoney(itemProfit)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-brand-muted">
                      Session item
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-brand-muted opacity-0 transition-opacity group-hover:opacity-100">
                    View details
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showPriceBreakdown && (
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
      )}
    </SectionCard>
  );
}
