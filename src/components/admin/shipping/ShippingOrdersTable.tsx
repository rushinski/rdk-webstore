import { Fragment } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import {
  getOrderItemFinancials,
  type AdminOrderItem,
} from "@/components/admin/orders/OrderItemDetailsModal";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import type { ShippingAddress, TabKey } from "@/types/domain/shipping";

import type { ShippingOrder, ShippingOrderItem } from "./shippingTypes";

const tableShellStyles =
  "overflow-x-hidden overflow-y-visible border border-brand-border bg-brand-surface md:overflow-x-auto";

const tableHeaderCellStyles =
  "sticky top-0 z-10 bg-brand-page p-3 text-left font-semibold text-brand-muted sm:p-4";

const rowStyles =
  "cursor-pointer border-b border-brand-border transition hover:bg-brand-page";
const mutedCellStyles = "p-3 text-brand-muted sm:p-4";
const strongCellStyles = "p-3 text-brand-text sm:p-4";
const actionLinkStyles = "text-sm text-brand-text transition hover:text-black";
const subtleActionLinkStyles =
  "text-sm text-brand-muted transition hover:text-brand-text";
const itemLabelStyles = "mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted";
const refundedPanelStyles = "border border-red-200 bg-red-50";
const refundedBadgeStyles =
  "inline-flex items-center border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700";

type ShippingOrdersTableProps = {
  activeTab: TabKey;
  orders: ShippingOrder[];
  expandedItems: Record<string, boolean>;
  expandedDetails: Record<string, boolean>;
  markingShippedId: string | null;
  onToggleItems: (orderId: string) => void;
  onToggleDetails: (orderId: string) => void;
  onToggleOrderExpansion: (orderId: string) => void;
  onCreateLabel: (order: ShippingOrder) => void;
  onMarkShipped: (order: ShippingOrder) => void;
  onViewLabel: (order: ShippingOrder) => void;
  onOpenItemDetails: (item: AdminOrderItem) => void;
  resolveShippingAddress: (value: unknown) => ShippingAddress | null;
  formatAddress: (address: ShippingAddress | null) => string | null;
  getTrackingUrl: (
    carrier?: string | null,
    trackingNumber?: string | null,
  ) => string | null;
  formatPlacedAt: (value?: string | null) => { date: string; time: string };
  getCustomerName: (order: ShippingOrder) => string;
  getPrimaryImage: (item: ShippingOrderItem) => string;
};

export function ShippingOrdersTable({
  activeTab,
  orders,
  expandedItems,
  expandedDetails,
  markingShippedId,
  onToggleItems,
  onToggleDetails,
  onToggleOrderExpansion,
  onCreateLabel,
  onMarkShipped,
  onViewLabel,
  onOpenItemDetails,
  resolveShippingAddress,
  formatAddress,
  getTrackingUrl,
  formatPlacedAt,
  getCustomerName,
  getPrimaryImage,
}: ShippingOrdersTableProps) {
  return (
    <div className={tableShellStyles}>
      <table className="w-full text-[12px] sm:text-sm">
        <thead>
          <tr className="bg-brand-page">
            <th className={tableHeaderCellStyles}>Placed At</th>
            <th className={tableHeaderCellStyles}>Order</th>
            <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Customer</th>
            <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>
              Destination
            </th>
            <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Tracking</th>
            <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Label</th>
            <th className={`${tableHeaderCellStyles} md:text-right`}>
              <span className="hidden md:inline">Items</span>
              <span className="md:hidden">Actions</span>
            </th>
            <th className={`hidden text-right md:table-cell ${tableHeaderCellStyles}`}>
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const itemCount = (order.items ?? []).reduce(
              (sum: number, item: ShippingOrderItem) => sum + Number(item.quantity ?? 0),
              0,
            );
            const address = resolveShippingAddress(order.shipping);
            const addressLine = formatAddress(address);
            const trackingUrl = getTrackingUrl(
              order.shipping_carrier,
              order.tracking_number,
            );
            const placedAt = formatPlacedAt(order.created_at);
            const customerName = getCustomerName(order);
            const itemsExpanded = expandedItems[order.id] ?? false;
            const detailsExpanded = expandedDetails[order.id] ?? false;
            const colSpan = 8;
            const labelUrl = order.label_url ?? null;

            const actionNode =
              activeTab === "label" ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCreateLabel(order);
                  }}
                  className={actionLinkStyles}
                >
                  Create label
                </button>
              ) : activeTab === "ready" ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMarkShipped(order);
                  }}
                  disabled={markingShippedId === order.id}
                  className={`${subtleActionLinkStyles} disabled:text-brand-muted`}
                >
                  {markingShippedId === order.id ? "Marking..." : "Mark shipped"}
                </button>
              ) : (
                <span className="text-brand-muted">-</span>
              );

            return (
              <Fragment key={order.id}>
                <tr
                  onClick={() => onToggleOrderExpansion(order.id)}
                  className={rowStyles}
                >
                  <td className={mutedCellStyles}>
                    {placedAt.date !== "-" ? (
                      <div className="space-y-1">
                        <div>{placedAt.date}</div>
                        {placedAt.time && (
                          <div className="text-xs text-brand-muted">{placedAt.time}</div>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className={strongCellStyles}>#{order.id.slice(0, 8)}</td>
                  <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                    {customerName}
                  </td>
                  <td className="hidden max-w-[320px] truncate p-3 text-brand-muted sm:p-4 md:table-cell">
                    {addressLine ? (
                      addressLine
                    ) : (
                      <span className="text-red-700">Missing address</span>
                    )}
                  </td>
                  <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                    {order.tracking_number ? (
                      <div className="space-y-1">
                        {trackingUrl ? (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="flex items-center gap-1 text-brand-text transition hover:text-black"
                          >
                            {order.tracking_number}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-brand-text">{order.tracking_number}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-brand-muted">No tracking yet</span>
                    )}
                  </td>
                  <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                    {labelUrl ? (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onViewLabel(order);
                        }}
                        className={actionLinkStyles}
                      >
                        Print Label
                      </button>
                    ) : (
                      <span className="text-brand-muted">No label yet</span>
                    )}
                  </td>
                  <td className="p-3 text-left sm:p-4 md:text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleItems(order.id);
                      }}
                      className="hidden items-center gap-2 text-sm text-brand-text transition hover:text-black md:inline-flex"
                    >
                      {itemsExpanded ? "Hide items" : `View items (${itemCount})`}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${itemsExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleDetails(order.id);
                      }}
                      className="inline-flex w-full items-center justify-start gap-1 whitespace-nowrap text-[12px] leading-none text-brand-text transition hover:text-black md:hidden"
                    >
                      {detailsExpanded ? "Hide label info" : "Label info"}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${detailsExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </td>
                  <td className="hidden p-3 text-right sm:p-4 md:table-cell">
                    {actionNode}
                  </td>
                </tr>

                {itemsExpanded && (
                  <tr className="hidden bg-brand-page md:table-row">
                    <td colSpan={colSpan} className="border-b border-brand-border p-0">
                      <div className="flex flex-col">
                        {(order.items ?? []).map((item: ShippingOrderItem) => {
                          const imageUrl = getPrimaryImage(item);
                          const title = item.product_name ?? item.product?.name ?? "Item";
                          const itemFinancials = getOrderItemFinancials(item);
                          const isPositive = itemFinancials.unitProfit >= 0;
                          const isRefunded = Boolean(item.refunded_at);

                          return (
                            <div
                              key={item.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenItemDetails(item);
                              }}
                              className={`group relative cursor-pointer px-6 py-4 transition-colors ${
                                isRefunded
                                  ? refundedPanelStyles
                                  : "hover:bg-brand-surface"
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
                                    ${Number(item.line_total ?? 0).toFixed(2)}
                                  </div>
                                </div>

                                <div className="w-32 flex-shrink-0 text-left">
                                  <div className={itemLabelStyles}>Profit</div>
                                  <div
                                    className={`text-sm font-bold ${isPositive ? "text-emerald-700" : "text-red-700"}`}
                                  >
                                    {isPositive ? "+" : "-"}$
                                    {Math.abs(itemFinancials.unitProfit).toFixed(2)}
                                  </div>
                                </div>

                                <div className="w-20 flex-shrink-0">
                                  {isRefunded ? (
                                    <AdminStatusBadge tone="danger">
                                      Refunded
                                    </AdminStatusBadge>
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

                {detailsExpanded && (
                  <tr className="border-b border-brand-border bg-brand-page md:hidden">
                    <td colSpan={colSpan} className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-brand-muted">Customer</span>
                          <span className="text-brand-text">{customerName}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-brand-muted">Destination</span>
                          <span className="break-words text-brand-text">
                            {addressLine ? addressLine : "Missing address"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-brand-muted">Tracking</span>
                          <span className="text-brand-text">
                            {order.tracking_number ? (
                              trackingUrl ? (
                                <a
                                  href={trackingUrl}
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
                            {labelUrl ? (
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
                            const imageUrl = getPrimaryImage(item);
                            const title =
                              item.product_name ?? item.product?.name ?? "Item";
                            const itemFinancials = getOrderItemFinancials(item);
                            const formattedUnitProfit = `${
                              itemFinancials.unitProfit >= 0 ? "+" : "-"
                            }$${Math.abs(itemFinancials.unitProfit).toFixed(2)}`;
                            const isRefunded = Boolean(item.refunded_at);

                            return (
                              <div
                                key={item.id}
                                onClick={() => onOpenItemDetails(item)}
                                className={`relative flex cursor-pointer items-start gap-3 rounded-sm p-2 text-base transition ${
                                  isRefunded
                                    ? refundedPanelStyles
                                    : "hover:bg-brand-surface"
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
                                    Size{" "}
                                    {item.size_label ?? item.variant?.size_label ?? "N/A"}{" "}
                                    - Qty {item.quantity}
                                  </div>
                                  <div className="mt-0.5 text-sm font-medium text-brand-text">
                                    ${Number(item.line_total ?? 0).toFixed(2)}
                                  </div>
                                  <div className="mt-0.5 text-xs text-brand-muted">
                                    Price ${itemFinancials.unitPrice.toFixed(2)} - Profit{" "}
                                    <span
                                      className={
                                        itemFinancials.unitProfit >= 0
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
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
