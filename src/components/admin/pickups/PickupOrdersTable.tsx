import { Fragment } from "react";
import { ChevronDown } from "lucide-react";

import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import {
  getOrderItemFinancials,
  type AdminOrderItem,
} from "@/components/admin/orders/OrderItemDetailsModal";
import { getOrderNetProfitDollars } from "@/lib/orders/metrics";

import type { PickupOrder, PickupOrderItem } from "./pickupTypes";

const tableHeaderCellStyles =
  "bg-brand-page p-3 text-left font-semibold text-brand-muted sm:p-4";

const rowStyles =
  "cursor-pointer border-b border-brand-border transition hover:bg-brand-page";
const refundedPanelStyles = "border border-red-200 bg-red-50";
const itemLabelStyles = "mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted";
const mobileItemActionStyles = "mt-1 text-xs text-brand-text transition hover:text-black";

type PickupOrdersTableProps = {
  activeTab: "pending" | "completed";
  filteredOrders: PickupOrder[];
  expandedOrders: Record<string, boolean>;
  expandedDetails: Record<string, boolean>;
  markingId: string | null;
  onToggleOrderExpansion: (orderId: string) => void;
  onToggleOrderItems: (orderId: string) => void;
  onToggleOrderDetails: (orderId: string) => void;
  onMarkPickedUp: (order: PickupOrder) => void;
  onOpenItemDetails: (item: AdminOrderItem) => void;
  getCustomerName: (order: PickupOrder) => string;
  getCustomerEmail: (order: PickupOrder) => string;
  getOrderTitle: (item: PickupOrderItem) => string;
  getPrimaryImage: (item: PickupOrderItem) => string;
};

export function PickupOrdersTable({
  activeTab,
  filteredOrders,
  expandedOrders,
  expandedDetails,
  markingId,
  onToggleOrderExpansion,
  onToggleOrderItems,
  onToggleOrderDetails,
  onMarkPickedUp,
  onOpenItemDetails,
  getCustomerName,
  getCustomerEmail,
  getOrderTitle,
  getPrimaryImage,
}: PickupOrdersTableProps) {
  return (
    <table className="w-full text-[12px] sm:text-sm">
      <thead>
        <tr className="border-b border-brand-border bg-brand-page">
          <th className={tableHeaderCellStyles}>Placed At</th>
          <th className={tableHeaderCellStyles}>Order</th>
          <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Customer</th>
          <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Email</th>
          <th className={`hidden md:table-cell ${tableHeaderCellStyles}`}>Fulfillment</th>
          <th className={`${tableHeaderCellStyles} text-right`}>Amount</th>
          <th className={`hidden text-right md:table-cell ${tableHeaderCellStyles}`}>
            Profit
          </th>
          <th className={`${tableHeaderCellStyles} md:text-right`}>
            <span className="hidden md:inline">Items</span>
            <span className="md:hidden">Details</span>
          </th>
          <th className={`hidden text-center md:table-cell ${tableHeaderCellStyles}`}>
            Complete
          </th>
        </tr>
      </thead>
      <tbody>
        {filteredOrders.map((order) => {
          const profit = getOrderNetProfitDollars({
            subtotal: order.subtotal,
            total: order.total,
            refundAmountRaw: order.refund_amount,
            items: order.items,
            resolveUnitCost: (item) =>
              Number(item.unit_cost ?? (item.variant?.unit_cost_cents ?? 0) / 100),
          });
          const profitPrefix = profit >= 0 ? "+" : "-";
          const createdAt = order.created_at ? new Date(order.created_at) : null;
          const customerName = getCustomerName(order);
          const customerEmail = getCustomerEmail(order);
          const fulfillmentLabel = order.fulfillment === "pickup" ? "Pickup" : "Ship";
          const itemsExpanded = expandedOrders[order.id] ?? false;
          const detailsExpanded = expandedDetails[order.id] ?? false;
          const colSpan = 9;
          const isPickedUp =
            activeTab === "completed" || order.fulfillment_status === "picked_up";
          const isDisabled = isPickedUp || markingId === order.id;
          const itemCount = (order.items ?? []).reduce(
            (sum: number, item: PickupOrderItem) => sum + Number(item.quantity ?? 0),
            0,
          );

          return (
            <Fragment key={order.id}>
              <tr onClick={() => onToggleOrderExpansion(order.id)} className={rowStyles}>
                <td className="p-3 text-brand-muted sm:p-4">
                  {createdAt ? (
                    <div className="space-y-1">
                      <div>{createdAt.toLocaleDateString()}</div>
                      <div className="text-xs text-brand-muted">
                        {createdAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-3 text-brand-text sm:p-4">#{order.id.slice(0, 8)}</td>
                <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                  {customerName}
                </td>
                <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                  {customerEmail}
                </td>
                <td className="hidden p-3 text-brand-muted sm:p-4 md:table-cell">
                  {fulfillmentLabel}
                </td>
                <td className="p-3 text-right text-brand-text sm:p-4">
                  ${Number(order.total ?? 0).toFixed(2)}
                </td>
                <td
                  className={`hidden p-3 text-right sm:p-4 md:table-cell ${
                    profit >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {profitPrefix}${Math.abs(profit).toFixed(2)}
                </td>
                <td className="p-3 text-left sm:p-4 md:text-right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleOrderItems(order.id);
                    }}
                    className="hidden items-center gap-2 text-sm text-brand-text transition hover:text-black md:inline-flex"
                  >
                    {itemsExpanded ? "Hide items" : `View items (${itemCount})`}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        itemsExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleOrderDetails(order.id);
                    }}
                    className="inline-flex w-full items-center justify-start gap-1 whitespace-nowrap text-[12px] leading-none text-brand-text transition hover:text-black md:hidden"
                  >
                    {detailsExpanded ? "Hide details" : "View details"}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        detailsExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </td>
                <td className="hidden p-3 sm:p-4 md:table-cell">
                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      className="rdk-checkbox"
                      checked={isPickedUp}
                      disabled={isDisabled}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => {
                        if (!isPickedUp) {
                          void onMarkPickedUp(order);
                        }
                      }}
                      aria-label={`Mark order ${order.id} picked up`}
                    />
                  </div>
                </td>
              </tr>
              {itemsExpanded && (
                <tr className="hidden bg-brand-page md:table-row">
                  <td colSpan={colSpan} className="border-b border-brand-border p-0">
                    <div className="flex flex-col">
                      {(order.items ?? []).map((item: PickupOrderItem) => {
                        const imageUrl = getPrimaryImage(item);
                        const title = getOrderTitle(item);
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
                                  {item.size_label ?? item.variant?.size_label ?? "N/A"}
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
                                  className={`text-sm font-bold ${
                                    isPositive ? "text-emerald-700" : "text-red-700"
                                  }`}
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
                        <span className="text-brand-muted">Placed</span>
                        <span className="text-brand-text">
                          {createdAt
                            ? `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-brand-muted">Customer</span>
                        <span className="text-brand-text">{customerName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-brand-muted">Email</span>
                        <span className="truncate text-brand-text">{customerEmail}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-brand-muted">Fulfillment</span>
                        <span className="text-brand-text">{fulfillmentLabel}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-brand-muted">Profit</span>
                        <span
                          className={profit >= 0 ? "text-emerald-700" : "text-red-700"}
                        >
                          {profitPrefix}${Math.abs(profit).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-brand-muted">Pickup</span>
                        {isPickedUp ? (
                          <span className="text-brand-text">Completed</span>
                        ) : (
                          <label className="flex items-center gap-2 text-brand-text">
                            <input
                              type="checkbox"
                              className="rdk-checkbox"
                              checked={false}
                              disabled={isDisabled}
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
                                src={getPrimaryImage(item)}
                                alt={getOrderTitle(item)}
                                className="h-14 w-14 flex-shrink-0 border border-brand-border bg-brand-page object-cover"
                              />
                              <div className="min-w-0">
                                <div className="truncate text-brand-text">
                                  {getOrderTitle(item)}
                                </div>
                                <div className="text-sm text-brand-muted">
                                  Size{" "}
                                  {item.size_label ?? item.variant?.size_label ?? "N/A"} -
                                  Qty {item.quantity}
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
                                  className={mobileItemActionStyles}
                                >
                                  View more details
                                </button>
                              </div>
                              {isRefunded && (
                                <div className="absolute right-2 top-2">
                                  <AdminStatusBadge tone="danger">
                                    Refunded
                                  </AdminStatusBadge>
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
  );
}
