"use client";

import { Fragment } from "react";
import { ChevronDown } from "lucide-react";

import { PickupOrderExpansionPanels } from "@/components/admin/pickups/PickupOrderExpansionPanels";
import type { PickupOrdersTableProps } from "@/components/admin/pickups/pickupOrdersTableTypes";
import { buildPickupOrderRowModel } from "@/components/admin/pickups/pickupOrdersTableView";
import type { PickupOrder } from "@/components/admin/pickups/pickupTypes";

const rowStyles =
  "cursor-pointer border-b border-brand-border transition hover:bg-brand-page";

type PickupOrdersTableRowProps = Pick<
  PickupOrdersTableProps,
  | "activeTab"
  | "expandedDetails"
  | "expandedOrders"
  | "getCustomerEmail"
  | "getCustomerName"
  | "getOrderTitle"
  | "getPrimaryImage"
  | "markingId"
  | "onMarkPickedUp"
  | "onOpenItemDetails"
  | "onToggleOrderDetails"
  | "onToggleOrderExpansion"
  | "onToggleOrderItems"
> & {
  order: PickupOrder;
};

export function PickupOrdersTableRow({
  activeTab,
  expandedDetails,
  expandedOrders,
  getCustomerEmail,
  getCustomerName,
  getOrderTitle,
  getPrimaryImage,
  markingId,
  onMarkPickedUp,
  onOpenItemDetails,
  onToggleOrderDetails,
  onToggleOrderExpansion,
  onToggleOrderItems,
  order,
}: PickupOrdersTableRowProps) {
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

  return (
    <Fragment>
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
              className={`h-4 w-4 transition-transform ${itemsExpanded ? "rotate-180" : ""}`}
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
              className={`h-4 w-4 transition-transform ${detailsExpanded ? "rotate-180" : ""}`}
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
        colSpan={9}
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
}
