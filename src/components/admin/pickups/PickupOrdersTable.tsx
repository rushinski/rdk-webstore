import { PickupOrdersTableHeader } from "@/components/admin/pickups/PickupOrdersTableHeader";
import { PickupOrdersTableRow } from "@/components/admin/pickups/PickupOrdersTableRow";
import type { PickupOrdersTableProps } from "@/components/admin/pickups/pickupOrdersTableTypes";

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
      <PickupOrdersTableHeader />
      <tbody>
        {filteredOrders.map((order) => (
          <PickupOrdersTableRow
            key={order.id}
            activeTab={activeTab}
            expandedDetails={expandedDetails}
            expandedOrders={expandedOrders}
            getCustomerEmail={getCustomerEmail}
            getCustomerName={getCustomerName}
            getOrderTitle={getOrderTitle}
            getPrimaryImage={getPrimaryImage}
            markingId={markingId}
            onMarkPickedUp={onMarkPickedUp}
            onOpenItemDetails={onOpenItemDetails}
            onToggleOrderDetails={onToggleOrderDetails}
            onToggleOrderExpansion={onToggleOrderExpansion}
            onToggleOrderItems={onToggleOrderItems}
            order={order}
          />
        ))}
      </tbody>
    </table>
  );
}
