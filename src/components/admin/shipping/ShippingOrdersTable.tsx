import { Fragment } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import type { AdminOrderItem } from "@/components/admin/orders/OrderItemDetailsModal";
import { ShippingOrderExpansionPanels } from "@/components/admin/shipping/ShippingOrderExpansionPanels";
import {
  buildShippingActionNode,
  buildShippingOrderRowModel,
} from "@/components/admin/shipping/shippingOrdersTableView";
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
            const colSpan = 8;
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
                <ShippingOrderExpansionPanels
                  actionLinkStyles={actionLinkStyles}
                  actionNode={actionNode}
                  colSpan={colSpan}
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
          })}
        </tbody>
      </table>
    </div>
  );
}
