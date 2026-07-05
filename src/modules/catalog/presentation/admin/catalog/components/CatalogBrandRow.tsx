"use client";

import { ChevronDown } from "lucide-react";

import { AdminStatusBadge } from "@/modules/shared/presentation/admin/ui/AdminStatusBadge";
import { adminButtonStyles } from "@/modules/shared/presentation/admin/ui/adminButtonStyles";
import { CatalogActionMenu } from "@/modules/catalog/presentation/admin/catalog/components/CatalogActionMenu";
import { CatalogBrandModelsList } from "@/modules/catalog/presentation/admin/catalog/components/CatalogBrandModelsList";
import { catalogStyles } from "@/modules/catalog/presentation/admin/catalog/components/catalogStyles";
import type { Brand, Model } from "@/modules/catalog/presentation/admin/catalog/types";

type CatalogBrandRowProps = {
  brand: Brand;
  isExpanded: boolean;
  models: Model[];
  onDeleteBrand: (brand: Brand) => void;
  onDeleteModel: (model: Model) => void;
  onEditBrand: (brand: Brand) => void;
  onEditModel: (model: Model) => void;
  onOpenAddModel: (brand: Brand) => void;
  onToggleBrandExpansion: (brandId: string) => void;
  onToggleMenu: (key: string) => void;
  openMenuKey: string | null;
};

function getModelCountLabel(count: number) {
  return `${count} model${count === 1 ? "" : "s"}`;
}

export function CatalogBrandRow({
  brand,
  isExpanded,
  models,
  onDeleteBrand,
  onDeleteModel,
  onEditBrand,
  onEditModel,
  onOpenAddModel,
  onToggleBrandExpansion,
  onToggleMenu,
  openMenuKey,
}: CatalogBrandRowProps) {
  return (
    <tr>
      <td colSpan={2} className="p-0">
        <div
          className={`${catalogStyles.tableRow} grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto]`}
        >
          <div className={catalogStyles.tableCell}>
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => onToggleBrandExpansion(brand.id)}
                className="mt-0.5 text-brand-muted transition-colors hover:text-brand-text"
                aria-label={`Toggle ${brand.canonical_label} models`}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate font-semibold text-brand-text">
                    {brand.canonical_label}
                  </div>
                  <AdminStatusBadge tone={brand.is_active ? "success" : "neutral"}>
                    {brand.is_active ? "Active" : "Inactive"}
                  </AdminStatusBadge>
                  <AdminStatusBadge tone={brand.is_verified ? "success" : "warning"}>
                    {brand.is_verified ? "Verified" : "Unverified"}
                  </AdminStatusBadge>
                </div>
                <div className="mt-1 text-xs text-brand-muted">
                  {getModelCountLabel(models.length)}
                </div>
              </div>
            </div>
          </div>

          <div className={`${catalogStyles.tableCell} pt-0 sm:pt-4`}>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenAddModel(brand)}
                className={adminButtonStyles.secondary}
              >
                Add Model
              </button>
              <CatalogActionMenu
                menuKey={`brand-${brand.id}`}
                openMenuKey={openMenuKey}
                onToggle={onToggleMenu}
                onEdit={() => onEditBrand(brand)}
                onDelete={() => onDeleteBrand(brand)}
              />
            </div>
          </div>
        </div>

        {isExpanded ? (
          <div className="border-b border-brand-border bg-brand-page px-4 py-4 sm:px-6">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
              Models
            </div>
            <CatalogBrandModelsList
              models={models}
              onDeleteModel={onDeleteModel}
              onEditModel={onEditModel}
              onToggleMenu={onToggleMenu}
              openMenuKey={openMenuKey}
            />
          </div>
        ) : null}
      </td>
    </tr>
  );
}

