import { Fragment } from "react";
import { ChevronDown } from "lucide-react";

import { type AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";
import { PickupOrderExpansionPanels } from "@/components/admin/pickups/PickupOrderExpansionPanels";
import { buildPickupOrderRowModel } from "@/components/admin/pickups/pickupOrdersTableView";

import type { PickupOrder, PickupOrderItem } from "./pickupTypes";

const tableHeaderCellStyles =
  "bg-brand-page p-3 text-left font-semibold text-brand-muted sm:p-4";

const rowStyles =
  "cursor-pointer border-b border-brand-border transition hover:bg-brand-page";

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
          const rowModel = buildPickupOrderRowModel({
            activeTab,
            expandedDetails,
            expandedOrders,
            getCustomerEmail,
            getCustomerName,
            markingId,
            order,
          });
          const {
            createdAt,
            customerEmail,
            customerName,
            detailsExpanded,
            fulfillmentLabel,
            isDisabled,
            isPickedUp,
            itemCount,
            itemsExpanded,
            profit,
            profitPrefix,
          } = rowModel;
          const colSpan = 9;

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
              <PickupOrderExpansionPanels
                colSpan={colSpan}
                getOrderTitle={getOrderTitle}
                getPrimaryImage={getPrimaryImage}
                markingId={markingId}
                onMarkPickedUp={onMarkPickedUp}
                onOpenItemDetails={onOpenItemDetails}
                order={order}
                rowModel={rowModel}
              />
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
