import { PickupExpandedItemsRow } from "@/modules/orders/presentation/admin/pickups/PickupExpandedItemsRow";
import { PickupMobileDetailsRow } from "@/modules/orders/presentation/admin/pickups/PickupMobileDetailsRow";
import type { PickupOrderExpansionPanelsProps } from "@/modules/orders/presentation/admin/pickups/pickupOrderExpansionTypes";

export function PickupOrderExpansionPanels({
  colSpan,
  getOrderTitle,
  getPrimaryImage,
  markingId,
  onMarkPickedUp,
  onOpenItemDetails,
  order,
  rowModel,
}: PickupOrderExpansionPanelsProps) {
  return (
    <>
      {rowModel.itemsExpanded ? (
        <PickupExpandedItemsRow
          colSpan={colSpan}
          getOrderTitle={getOrderTitle}
          getPrimaryImage={getPrimaryImage}
          onOpenItemDetails={onOpenItemDetails}
          order={order}
        />
      ) : null}

      {rowModel.detailsExpanded ? (
        <PickupMobileDetailsRow
          colSpan={colSpan}
          getOrderTitle={getOrderTitle}
          getPrimaryImage={getPrimaryImage}
          markingId={markingId}
          onMarkPickedUp={onMarkPickedUp}
          onOpenItemDetails={onOpenItemDetails}
          order={order}
          rowModel={rowModel}
        />
      ) : null}
    </>
  );
}
