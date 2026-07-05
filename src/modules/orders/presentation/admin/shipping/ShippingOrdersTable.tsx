import { ShippingOrdersTableHeader } from "@/modules/orders/presentation/admin/shipping/ShippingOrdersTableHeader";
import { ShippingOrdersTableRow } from "@/modules/orders/presentation/admin/shipping/ShippingOrdersTableRow";
import type { ShippingOrdersTableProps } from "@/modules/orders/presentation/admin/shipping/shippingOrdersTableTypes";

const tableShellStyles =
  "overflow-x-hidden overflow-y-visible border border-brand-border bg-brand-surface md:overflow-x-auto";

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
        <ShippingOrdersTableHeader />
        <tbody>
          {orders.map((order) => {
            return (
              <ShippingOrdersTableRow
                key={order.id}
                activeTab={activeTab}
                expandedDetails={expandedDetails}
                expandedItems={expandedItems}
                formatAddress={formatAddress}
                formatPlacedAt={formatPlacedAt}
                getCustomerName={getCustomerName}
                getPrimaryImage={getPrimaryImage}
                getTrackingUrl={getTrackingUrl}
                markingShippedId={markingShippedId}
                onCreateLabel={onCreateLabel}
                onMarkShipped={onMarkShipped}
                onOpenItemDetails={onOpenItemDetails}
                onToggleDetails={onToggleDetails}
                onToggleItems={onToggleItems}
                onToggleOrderExpansion={onToggleOrderExpansion}
                onViewLabel={onViewLabel}
                order={order}
                resolveShippingAddress={resolveShippingAddress}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
