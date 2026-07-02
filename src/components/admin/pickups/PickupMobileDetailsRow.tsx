"use client";

import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { buildPickupOrderItemModel } from "@/components/admin/pickups/pickupOrdersTableView";
import type { PickupOrderExpansionPanelsProps } from "@/components/admin/pickups/pickupOrderExpansionTypes";
import type { PickupOrderItem } from "@/components/admin/pickups/pickupTypes";

const refundedPanelStyles = "border border-red-200 bg-red-50";
const mobileItemActionStyles = "mt-1 text-xs text-brand-text transition hover:text-black";

type PickupMobileDetailsRowProps = Pick<
  PickupOrderExpansionPanelsProps,
  | "colSpan"
  | "getOrderTitle"
  | "getPrimaryImage"
  | "markingId"
  | "onMarkPickedUp"
  | "onOpenItemDetails"
  | "order"
  | "rowModel"
>;

export function PickupMobileDetailsRow({
  colSpan,
  getOrderTitle,
  getPrimaryImage,
  markingId,
  onMarkPickedUp,
  onOpenItemDetails,
  order,
  rowModel,
}: PickupMobileDetailsRowProps) {
  return (
    <tr className="border-b border-brand-border bg-brand-page md:hidden">
      <td colSpan={colSpan} className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-brand-muted">Placed</span>
            <span className="text-brand-text">
              {rowModel.createdAt
                ? `${rowModel.createdAt.toLocaleDateString()} ${rowModel.createdAt.toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}`
                : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-brand-muted">Customer</span>
            <span className="text-brand-text">{rowModel.customerName}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-brand-muted">Email</span>
            <span className="truncate text-brand-text">{rowModel.customerEmail}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-brand-muted">Fulfillment</span>
            <span className="text-brand-text">{rowModel.fulfillmentLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-brand-muted">Profit</span>
            <span className={rowModel.profit >= 0 ? "text-emerald-700" : "text-red-700"}>
              {rowModel.profitPrefix}${Math.abs(rowModel.profit).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-brand-muted">Pickup</span>
            {rowModel.isPickedUp ? (
              <span className="text-brand-text">Completed</span>
            ) : (
              <label className="flex items-center gap-2 text-brand-text">
                <input
                  type="checkbox"
                  className="rdk-checkbox"
                  checked={false}
                  disabled={rowModel.isDisabled}
                  onChange={() => {
                    void onMarkPickedUp(order);
                  }}
                  aria-label={`Mark order ${order.id} picked up`}
                />
                <span className="text-sm text-brand-text">
                  {markingId === order.id ? "Marking..." : "Mark complete"}
                </span>
              </label>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-brand-border pt-4">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-brand-muted">
            Items
          </div>
          <div className="space-y-2">
            {(order.items ?? []).map((item: PickupOrderItem) => {
              const {
                formattedLineTotal,
                formattedUnitPrice,
                formattedUnitProfit,
                imageUrl,
                isRefunded,
                title,
              } = buildPickupOrderItemModel(item, getOrderTitle, getPrimaryImage);

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenItemDetails(item)}
                  className={`relative flex cursor-pointer items-start gap-3 rounded-sm p-2 text-base transition ${
                    isRefunded ? refundedPanelStyles : "hover:bg-brand-surface"
                  }`}
                >
                  {isRefunded ? (
                    <span className="absolute inset-y-0 left-0 w-1 rounded-l-sm bg-red-300" />
                  ) : null}
                  <img
                    src={imageUrl}
                    alt={title}
                    className="h-14 w-14 flex-shrink-0 border border-brand-border bg-brand-page object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-brand-text">{title}</div>
                    <div className="text-sm text-brand-muted">
                      Size {item.size_label ?? item.variant?.size_label ?? "N/A"} - Qty{" "}
                      {item.quantity}
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-brand-text">
                      {formattedLineTotal}
                    </div>
                    <div className="mt-0.5 text-xs text-brand-muted">
                      Price {formattedUnitPrice} - Profit{" "}
                      <span
                        className={
                          formattedUnitProfit.startsWith("+")
                            ? "text-emerald-700"
                            : "text-red-700"
                        }
                      >
                        {formattedUnitProfit}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenItemDetails(item);
                      }}
                      className={mobileItemActionStyles}
                    >
                      View more details
                    </button>
                  </div>
                  {isRefunded ? (
                    <div className="absolute right-2 top-2">
                      <AdminStatusBadge tone="danger">Refunded</AdminStatusBadge>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </td>
    </tr>
  );
}
