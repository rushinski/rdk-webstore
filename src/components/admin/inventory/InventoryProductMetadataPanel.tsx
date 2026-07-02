"use client";

import type { ProductWithDetails } from "@/types/domain/product";

type InventoryProductMetadataPanelProps = {
  product: ProductWithDetails;
  summaryItems: readonly (readonly [string, string])[];
};

export function InventoryProductMetadataPanel({
  product,
  summaryItems,
}: InventoryProductMetadataPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2">
        {summaryItems.map(([label, value]) => (
          <div key={label} className="border border-brand-border bg-brand-page p-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              {label}
            </div>
            <div className="text-base font-semibold text-brand-text">{value}</div>
          </div>
        ))}
      </div>

      <div className="border border-brand-border bg-brand-page p-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              Brand
            </div>
            <div className="text-sm font-medium text-brand-text">
              {product.brand || "-"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              Model
            </div>
            <div className="text-sm font-medium text-brand-text">
              {product.model || "-"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              Category
            </div>
            <div className="text-sm font-medium capitalize text-brand-text">
              {product.category || "-"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              Condition
            </div>
            <div className="text-sm font-medium capitalize text-brand-text">
              {product.condition || "-"}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              Description
            </div>
            <div className="mt-1 whitespace-pre-wrap text-sm text-brand-muted">
              {product.description?.trim() || "-"}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
              Tags
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {product.tags.length > 0 ? (
                product.tags.map((tag) => (
                  <span
                    key={`${tag.group_key}:${tag.label}`}
                    className="border border-brand-border bg-brand-surface px-1.5 py-0.5 text-[10px] text-brand-text"
                  >
                    {tag.label}
                  </span>
                ))
              ) : (
                <span className="text-sm text-brand-muted">-</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
