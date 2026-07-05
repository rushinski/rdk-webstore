import type { ComponentType, ReactNode } from "react";
import { Hash, Layers, Package, Tag } from "lucide-react";

import type { AdminOrderItem } from "@/modules/orders/presentation/admin/order-item-details/orderItemDetailsTypes";
import type { AdminOrderItemFinancials } from "@/modules/orders/presentation/admin/order-item-details/orderItemTypes";
import {
  formatOrderItemMoney,
  getOrderItemTagLabels,
} from "@/modules/orders/presentation/admin/order-item-details/orderItemDetailsView";

const DetailRow = ({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) => (
  <div className={`flex flex-col gap-0.5 ${className ?? ""}`}>
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-muted">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </div>
    <div className="truncate text-sm font-medium text-brand-text">{value}</div>
  </div>
);

const StatCard = ({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string;
  color?: "default" | "green" | "red";
}) => {
  const colorStyles = {
    default: "text-brand-text",
    green: "text-emerald-700",
    red: "text-red-700",
  };

  return (
    <div className="flex flex-col border border-brand-border bg-brand-page p-3">
      <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-muted">
        {label}
      </span>
      <span className={`text-base font-semibold ${colorStyles[color]}`}>{value}</span>
    </div>
  );
};

type OrderItemMetadataPanelProps = {
  financials: AdminOrderItemFinancials;
  item: AdminOrderItem;
  showProfit: boolean;
};

export function OrderItemMetadataPanel({
  financials,
  item,
  showProfit,
}: OrderItemMetadataPanelProps) {
  const tagLabels = getOrderItemTagLabels(item);
  const formattedUnitProfit = formatOrderItemMoney(Math.abs(financials.unitProfit));
  const profitColor = financials.unitProfit >= 0 ? "green" : "red";
  const profitPrefix = financials.unitProfit >= 0 ? "+" : "-";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Bought" value={formatOrderItemMoney(financials.unitCost)} />
        <StatCard label="Sold" value={formatOrderItemMoney(financials.unitPrice)} />
        <StatCard label="Quantity" value={financials.quantity.toString()} />
        {showProfit && (
          <StatCard
            label="Profit"
            value={`${profitPrefix}${formattedUnitProfit}`}
            color={profitColor}
          />
        )}
      </div>

      <div className="border border-brand-border bg-brand-page p-4">
        <div className="grid grid-cols-2 gap-x-2 gap-y-4">
          <DetailRow
            label="Brand"
            value={item.brand || item.product?.brand || "-"}
            icon={Package}
          />
          <DetailRow
            label="Category"
            value={item.category || item.product?.category || "-"}
            icon={Layers}
          />
          <DetailRow label="Model" value={item.model || item.product?.model || "-"} />
          <DetailRow
            label="Size"
            value={item.size_label || item.variant?.size_label || "N/A"}
            icon={Hash}
          />
        </div>

        <div className="mt-4 border-t border-brand-border pt-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-muted">
            <Tag className="h-3 w-3" /> Tags
          </div>
          {tagLabels.length ? (
            <div className="flex flex-wrap gap-1.5">
              {tagLabels.map((tag) => (
                <span
                  key={tag}
                  className="border border-brand-border bg-brand-surface px-1.5 py-0.5 text-[10px] text-brand-text"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs italic text-brand-muted">No tags</span>
          )}
        </div>
      </div>

      <div>
        <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-muted">
          Description
        </h4>
        <div className="max-h-32 overflow-y-auto border border-brand-border bg-brand-page p-3 text-xs leading-relaxed text-brand-muted">
          {item.product?.description ? (
            <p className="whitespace-pre-wrap">{item.product.description}</p>
          ) : (
            <p className="italic opacity-70">No description.</p>
          )}
        </div>
      </div>
    </div>
  );
}
