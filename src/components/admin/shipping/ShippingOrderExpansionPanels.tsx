import { ExternalLink } from "lucide-react";

import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import {
  buildShippingOrderItemModel,
  type ShippingOrderRowModel,
} from "@/components/admin/shipping/shippingOrdersTableView";

import type { ShippingOrder, ShippingOrderItem } from "./shippingTypes";

const itemLabelStyles = "mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted";
const refundedPanelStyles = "border border-red-200 bg-red-50";
const refundedBadgeStyles =
  "inline-flex items-center border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700";

type ShippingOrderExpansionPanelsProps = {
  actionLinkStyles: string;
  actionNode: React.ReactNode;
  colSpan: number;
  getPrimaryImage: (item: ShippingOrderItem) => string;
  onOpenItemDetails: (item: AdminOrderItem) => void;
  onViewLabel: (order: ShippingOrder) => void;
  order: ShippingOrder;
  rowModel: ShippingOrderRowModel;
};

export function ShippingOrderExpansionPanels({
  actionLinkStyles,
  actionNode,
  colSpan,
  getPrimaryImage,
  onOpenItemDetails,
  onViewLabel,
  order,
  rowModel,
}: ShippingOrderExpansionPanelsProps) {
  return (
    <>
      {rowModel.itemsExpanded && (
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
                    {isRefunded && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-red-300" />
                    )}
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
      )}

      {rowModel.detailsExpanded && (
        <tr className="border-b border-brand-border bg-brand-page md:hidden">
          <td colSpan={colSpan} className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-brand-muted">Customer</span>
                <span className="text-brand-text">{rowModel.customerName}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-brand-muted">Destination</span>
                <span className="break-words text-brand-text">
                  {rowModel.addressLine ? rowModel.addressLine : "Missing address"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-brand-muted">Tracking</span>
                <span className="text-brand-text">
                  {order.tracking_number ? (
                    rowModel.trackingUrl ? (
                      <a
                        href={rowModel.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand-text transition hover:text-black"
                      >
                        {order.tracking_number}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      order.tracking_number
                    )
                  ) : (
                    <span className="text-brand-muted">No tracking yet</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-brand-muted">Label</span>
                <span className="text-brand-text">
                  {rowModel.labelUrl ? (
                    <button
                      onClick={() => onViewLabel(order)}
                      className={actionLinkStyles}
                    >
                      Print label
                    </button>
                  ) : (
                    <span className="text-brand-muted">No label yet</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-brand-muted">Action</span>
                <span className="text-brand-text">{actionNode}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-brand-border pt-4">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-brand-muted">
                Items
              </div>
              <div className="space-y-2">
                {(order.items ?? []).map((item: ShippingOrderItem) => {
                  const {
                    formattedLineTotal,
                    formattedUnitPrice,
                    formattedUnitProfit,
                    imageUrl,
                    isRefunded,
                    title,
                  } = buildShippingOrderItemModel(item, getPrimaryImage);

                  return (
                    <div
                      key={item.id}
                      onClick={() => onOpenItemDetails(item)}
                      className={`relative flex cursor-pointer items-start gap-3 rounded-sm p-2 text-base transition ${
                        isRefunded ? refundedPanelStyles : "hover:bg-brand-surface"
                      }`}
                    >
                      {isRefunded && (
                        <span className="absolute inset-y-0 left-0 w-1 rounded-l-sm bg-red-300" />
                      )}
                      <img
                        src={imageUrl}
                        alt={title}
                        className="h-14 w-14 flex-shrink-0 border border-brand-border bg-brand-page object-cover"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-brand-text">{title}</div>
                        <div className="text-sm text-brand-muted">
                          Size {item.size_label ?? item.variant?.size_label ?? "N/A"} -
                          Qty {item.quantity}
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
                          className="mt-1 text-xs text-brand-text transition hover:text-black"
                        >
                          View more details
                        </button>
                      </div>
                      {isRefunded && (
                        <div className="absolute right-2 top-2">
                          <span className={refundedBadgeStyles}>Refunded</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
