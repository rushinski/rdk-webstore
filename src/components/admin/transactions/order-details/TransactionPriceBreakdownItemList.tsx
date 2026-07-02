import { buildTransactionPriceBreakdownItemModel } from "./transactionPriceBreakdownView";
import type { OrderItem } from "./types";

type TransactionPriceBreakdownItemListProps = {
  fmtMoney: (value: number | null | undefined) => string;
  getOrderItemFinancials: (item: OrderItem) => {
    quantity: number;
    unitCost: number;
    unitProfit: number;
  };
  items: OrderItem[];
  onOpenItemModal: (item: OrderItem) => void;
  showOrderProfit: boolean;
  showPriceBreakdown: boolean;
};

export function TransactionPriceBreakdownItemList({
  fmtMoney,
  getOrderItemFinancials,
  items,
  onOpenItemModal,
  showOrderProfit,
  showPriceBreakdown,
}: TransactionPriceBreakdownItemListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-brand-muted">
        No products were recorded for this order.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {items.map((item) => {
        const { imageUrl, isRefunded, title } =
          buildTransactionPriceBreakdownItemModel(item);
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
              <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
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
  );
}
