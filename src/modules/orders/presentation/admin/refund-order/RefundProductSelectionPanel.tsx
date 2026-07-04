import type { AdminOrderItem } from "@/modules/orders/presentation/admin/order-item-details";
import {
  formatRefundMoney,
  fromRefundCents,
  getRefundItemImage,
  getRefundItemTitle,
} from "@/modules/orders/presentation/admin/refund-order";

type RefundProductSelectionPanelProps = {
  items: AdminOrderItem[];
  onToggleItem: (itemId: string) => void;
  selectedItemIds: string[];
  selectedProductRefundCents: number;
  submitting: boolean;
};

export function RefundProductSelectionPanel({
  items,
  onToggleItem,
  selectedItemIds,
  selectedProductRefundCents,
  submitting,
}: RefundProductSelectionPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-brand-muted">
        Select products to refund. Already-refunded products are excluded.
      </p>
      <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {items.map((item) => {
          const isRefunded = Boolean(item.refunded_at);
          const isSelected = selectedItemIds.includes(item.id);
          const lineTotal = Number(item.line_total ?? 0);

          return (
            <label
              key={item.id}
              className={`flex cursor-pointer items-center gap-3 border p-3 transition-colors ${
                isRefunded
                  ? "border-brand-border bg-brand-page opacity-50"
                  : isSelected
                    ? "border-brand-text bg-brand-page"
                    : "border-brand-border bg-brand-surface hover:border-brand-text"
              }`}
            >
              <input
                type="checkbox"
                className="rdk-checkbox"
                checked={isSelected}
                onChange={() => onToggleItem(item.id)}
                disabled={isRefunded || submitting}
              />
              <img
                src={getRefundItemImage(item)}
                alt={getRefundItemTitle(item)}
                className="h-10 w-10 flex-shrink-0 border border-brand-border bg-brand-page object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-brand-text">
                  {getRefundItemTitle(item)}
                </div>
                <div className="text-xs text-brand-muted">
                  Size {item.size_label ?? item.variant?.size_label ?? "N/A"} · Qty{" "}
                  {Number(item.quantity ?? 0)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-brand-text">
                  {formatRefundMoney(lineTotal)}
                </div>
                {isRefunded && (
                  <div className="text-[11px] uppercase tracking-wide text-brand-muted">
                    Refunded
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
      <div className="border border-brand-border bg-brand-page px-3 py-2 text-sm text-brand-muted">
        Selected total:{" "}
        <span className="font-semibold text-brand-text">
          {formatRefundMoney(fromRefundCents(selectedProductRefundCents))}
        </span>
      </div>
    </div>
  );
}
