"use client";

import { Fragment } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import { ShippingOrderExpansionPanels } from "@/components/admin/shipping/ShippingOrderExpansionPanels";
import {
  buildShippingActionNode,
  buildShippingOrderRowModel,
} from "@/components/admin/shipping/shippingOrdersTableView";
import type { ShippingOrdersTableProps } from "@/components/admin/shipping/shippingOrdersTableTypes";
import type { ShippingOrder } from "@/components/admin/shipping/shippingTypes";

const rowStyles =
  "cursor-pointer border-b border-brand-border transition hover:bg-brand-page";
const mutedCellStyles = "p-3 text-brand-muted sm:p-4";
const strongCellStyles = "p-3 text-brand-text sm:p-4";
const actionLinkStyles = "text-sm text-brand-text transition hover:text-black";
const subtleActionLinkStyles =
  "text-sm text-brand-muted transition hover:text-brand-text";

type ShippingOrdersTableRowProps = Pick<
  ShippingOrdersTableProps,
  | "activeTab"
  | "expandedDetails"
  | "expandedItems"
  | "formatAddress"
  | "formatPlacedAt"
  | "getCustomerName"
  | "getPrimaryImage"
  | "getTrackingUrl"
  | "markingShippedId"
  | "onCreateLabel"
  | "onMarkShipped"
  | "onOpenItemDetails"
  | "onToggleDetails"
  | "onToggleItems"
  | "onToggleOrderExpansion"
  | "onViewLabel"
  | "resolveShippingAddress"
> & {
  order: ShippingOrder;
};

export function ShippingOrdersTableRow({
  activeTab,
  expandedDetails,
  expandedItems,
  formatAddress,
  formatPlacedAt,
  getCustomerName,
  getPrimaryImage,
  getTrackingUrl,
  markingShippedId,
  onCreateLabel,
  onMarkShipped,
  onOpenItemDetails,
  onToggleDetails,
  onToggleItems,
  onToggleOrderExpansion,
  onViewLabel,
  order,
  resolveShippingAddress,
}: ShippingOrdersTableRowProps) {
  const {
    address,
    addressLine,
    customerName,
    detailsExpanded,
    itemCount,
    itemsExpanded,
    labelUrl,
    placedAt,
    trackingUrl,
  } = buildShippingOrderRowModel({
    expandedDetails,
    expandedItems,
    formatAddress,
    formatPlacedAt,
    getCustomerName,
    getTrackingUrl,
    order,
    resolveShippingAddress,
  });

  const actionNode = buildShippingActionNode({
    actionLinkStyles,
    activeTab,
    markingShippedId,
    onCreateLabel,
    onMarkShipped,
    order,
    subtleActionLinkStyles,
  });

  return (
    <Fragment>
      <tr onClick={() => onToggleOrderExpansion(order.id)} className={rowStyles}>
        <td className={mutedCellStyles}>
          {placedAt.date !== "-" ? (
            <div className="space-y-1">
              <div>{placedAt.date}</div>
              {placedAt.time ? (
                <div className="text-xs text-brand-muted">{placedAt.time}</div>
              ) : null}
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
                  <ExternalLink className="h-3 w-3" />
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
        <td className="hidden p-3 text-right sm:p-4 md:table-cell">{actionNode}</td>
      </tr>

      <ShippingOrderExpansionPanels
        actionLinkStyles={actionLinkStyles}
        actionNode={actionNode}
        colSpan={8}
        getPrimaryImage={getPrimaryImage}
        onOpenItemDetails={onOpenItemDetails}
        onViewLabel={onViewLabel}
        order={order}
        rowModel={{
          address,
          addressLine,
          customerName,
          detailsExpanded,
          itemCount,
          itemsExpanded,
          labelUrl,
          placedAt,
          trackingUrl,
        }}
      />
    </Fragment>
  );
}
