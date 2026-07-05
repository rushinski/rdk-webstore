"use client";

import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { buildShippingOrderItemModel } from "@/modules/orders/presentation/admin/shipping/shippingOrdersTableView";
import type { ShippingOrderExpansionPanelsProps } from "@/modules/orders/presentation/admin/shipping/shippingOrderExpansionTypes";
import type { ShippingOrderItem } from "@/modules/orders/presentation/admin/shipping/shippingTypes";

const itemLabelStyles = "mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted";
const refundedPanelStyles = "border border-red-200 bg-red-50";

type ShippingExpandedItemsRowProps = Pick<
  ShippingOrderExpansionPanelsProps,
  "colSpan" | "getPrimaryImage" | "onOpenItemDetails" | "order"
>;

export function ShippingExpandedItemsRow({
  colSpan,
  getPrimaryImage,
  onOpenItemDetails,
  order,
}: ShippingExpandedItemsRowProps) {
  return (
    <tr className="hidden bg-brand-page md:table-row">
      <td colSpan={colSpan} className="border-b border-brand-border p-0">
        <div className="flex flex-col">
          {(order.items ?? []).map((item: ShippingOrderItem) => {
            const {
              formattedLineTotal,
              formattedUnitProfit,
              imageUrl,
              isPositive,
              isRefunded,
              title,
            } = buildShippingOrderItemModel(item, getPrimaryImage);

            return (
              <div
                key={item.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenItemDetails(item);
                }}
                className={`group relative cursor-pointer px-6 py-4 transition-colors ${
                  isRefunded ? refundedPanelStyles : "hover:bg-brand-surface"
                }`}
              >
                {isRefunded ? (
                  <span className="absolute inset-y-0 left-0 w-1 bg-red-300" />
                ) : null}
                <div
                  className={`flex items-center justify-start gap-8 ${
                    isRefunded ? "opacity-60" : ""
                  }`}
                >
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden border border-brand-border bg-brand-page">
                    <img
                      src={imageUrl}
                      alt={title}
                      className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                    />
                  </div>

                  <div className="w-48 flex-shrink-0">
                    <div className={itemLabelStyles}>Product</div>
                    <div
                      className="truncate text-sm font-semibold text-brand-text"
                      title={title}
                    >
                      {title}
                    </div>
                  </div>

                  <div className="w-28 flex-shrink-0">
                    <div className={itemLabelStyles}>Size</div>
                    <div className="text-sm font-medium text-brand-text">
                      {item.variant?.size_label ?? "N/A"}
                    </div>
                  </div>

                  <div className="w-24 flex-shrink-0">
                    <div className={itemLabelStyles}>Qty</div>
                    <div className="text-sm font-medium text-brand-text">
                      {item.quantity}
                    </div>
                  </div>

                  <div className="w-32 flex-shrink-0 text-left">
                    <div className={itemLabelStyles}>Line Total</div>
                    <div className="text-sm font-bold text-brand-text">
                      {formattedLineTotal}
                    </div>
                  </div>

                  <div className="w-32 flex-shrink-0 text-left">
                    <div className={itemLabelStyles}>Profit</div>
                    <div
                      className={`text-sm font-bold ${
                        isPositive ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {formattedUnitProfit}
                    </div>
                  </div>

                  <div className="w-20 flex-shrink-0">
                    {isRefunded ? (
                      <AdminStatusBadge tone="danger">Refunded</AdminStatusBadge>
                    ) : (
                      <span className="text-xs font-medium text-brand-text transition-colors group-hover:text-black">
                        Details
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </td>
    </tr>
  );
}
