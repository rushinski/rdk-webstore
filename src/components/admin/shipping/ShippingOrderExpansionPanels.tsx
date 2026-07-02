import { ShippingExpandedItemsRow } from "@/components/admin/shipping/ShippingExpandedItemsRow";
import { ShippingMobileDetailsRow } from "@/components/admin/shipping/ShippingMobileDetailsRow";
import type { ShippingOrderExpansionPanelsProps } from "@/components/admin/shipping/shippingOrderExpansionTypes";

export function ShippingOrderExpansionPanels({
  actionLinkStyles,
  actionNode,
  colSpan,
  getPrimaryImage,
  onOpenItemDetails,
  onViewLabel,
  order,
  rowModel,
}: ShippingOrderExpansionPanelsProps) {
  return (
    <>
      {rowModel.itemsExpanded ? (
        <ShippingExpandedItemsRow
          colSpan={colSpan}
          getPrimaryImage={getPrimaryImage}
          onOpenItemDetails={onOpenItemDetails}
          order={order}
        />
      ) : null}

      {rowModel.detailsExpanded ? (
        <ShippingMobileDetailsRow
          actionLinkStyles={actionLinkStyles}
          actionNode={actionNode}
          colSpan={colSpan}
          getPrimaryImage={getPrimaryImage}
          onOpenItemDetails={onOpenItemDetails}
          onViewLabel={onViewLabel}
          order={order}
          rowModel={rowModel}
        />
      ) : null}
    </>
  );
}
