import { Fragment } from "react";

import { formatInventoryVariantMoney } from "@/modules/catalog/presentation/admin/inventory/inventoryProductListView";
import type { ProductVariantRow, ProductWithDetails } from "@/types/domain/product";

type InventoryProductVariantPanelsProps = {
  mode: "desktop" | "mobile";
  onOpenDetails: (product: ProductWithDetails, variant: ProductVariantRow) => void;
  product: ProductWithDetails;
  variantsOpen: boolean;
};

export function InventoryProductVariantPanels({
  mode,
  onOpenDetails,
  product,
  variantsOpen,
}: InventoryProductVariantPanelsProps) {
  if (!variantsOpen) {
    return null;
  }

  return (
    <Fragment>
      {mode === "desktop" ? (
        <tr className="border-b border-brand-border bg-brand-page">
          <td colSpan={8} className="p-0">
            <div className="py-1">
              <div className="flex flex-col">
                {product.variants.map((variant) => (
                  <div
                    key={variant.id}
                    onClick={() => onOpenDetails(product, variant)}
                    className="group flex cursor-pointer items-center justify-start gap-8 px-6 py-4 transition-colors hover:bg-brand-surface"
                  >
                    <div className="w-36 flex-shrink-0">
                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted">
                        SKU
                      </div>
                      <div className="text-sm font-mono text-brand-text">
                        {variant.sku || "N/A"}
                      </div>
                    </div>
                    <div className="w-28 flex-shrink-0">
                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted">
                        Size
                      </div>
                      <div className="text-sm font-medium text-brand-text">
                        {variant.size_label}
                      </div>
                    </div>
                    <div className="w-32 flex-shrink-0">
                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted">
                        Unit Cost
                      </div>
                      <div className="text-sm font-medium text-brand-text">
                        {formatInventoryVariantMoney(variant.unit_cost_cents)}
                      </div>
                    </div>
                    <div className="w-32 flex-shrink-0">
                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted">
                        Sale Price
                      </div>
                      <div className="text-sm font-bold text-brand-text">
                        {formatInventoryVariantMoney(variant.sale_price_cents)}
                      </div>
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <div className="mb-0.5 text-[10px] uppercase tracking-tight text-brand-muted">
                        Stock
                      </div>
                      <div className="text-sm font-medium text-brand-text">
                        {variant.stock ?? 0}
                      </div>
                    </div>
                    <div className="w-20 flex-shrink-0">
                      <span className="text-xs font-medium text-brand-text transition-colors group-hover:text-black">
                        Details
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      ) : (
        <div className="mt-3 space-y-2 border-t border-brand-border pt-3">
          {product.variants.map((variant) => (
            <div
              key={variant.id}
              onClick={() => onOpenDetails(product, variant)}
              className="cursor-pointer border border-brand-border bg-brand-page p-3 transition-colors hover:bg-brand-surface"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-text">
                <span>
                  <span className="text-brand-muted">SKU:</span>{" "}
                  <span className="font-mono">{variant.sku || "N/A"}</span>
                </span>
                <span>
                  <span className="text-brand-muted">Size:</span> {variant.size_label}
                </span>
                <span>
                  <span className="text-brand-muted">Unit Cost:</span>{" "}
                  {formatInventoryVariantMoney(variant.unit_cost_cents)}
                </span>
                <span>
                  <span className="text-brand-muted">Sale Price:</span>{" "}
                  {formatInventoryVariantMoney(variant.sale_price_cents)}
                </span>
                <span>
                  <span className="text-brand-muted">Stock:</span> {variant.stock ?? 0}
                </span>
                <span className="text-brand-text transition hover:text-black">
                  View details
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Fragment>
  );
}
