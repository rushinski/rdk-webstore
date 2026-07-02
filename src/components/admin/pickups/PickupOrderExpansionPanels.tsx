import { PickupExpandedItemsRow } from "@/components/admin/pickups/PickupExpandedItemsRow";
import { PickupMobileDetailsRow } from "@/components/admin/pickups/PickupMobileDetailsRow";
import type { PickupOrderExpansionPanelsProps } from "@/components/admin/pickups/pickupOrderExpansionTypes";

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
