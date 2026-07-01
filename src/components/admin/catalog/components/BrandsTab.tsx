"use client";

import { ChevronDown } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";

import type { Brand, Model } from "../types";

import { CatalogActionMenu } from "./CatalogActionMenu";
import { catalogStyles } from "./catalogStyles";

type BrandsTabProps = {
  isLoading: boolean;
  brands: Brand[];
  filteredModelsByBrandId: Record<string, Model[]>;
  expandedBrands: Record<string, boolean>;
  openMenuKey: string | null;
  onToggleBrandExpansion: (brandId: string) => void;
  onToggleMenu: (key: string) => void;
  onOpenAddBrand: () => void;
  onOpenAddModel: (brand: Brand) => void;
  onEditBrand: (brand: Brand) => void;
  onDeleteBrand: (brand: Brand) => void;
  onEditModel: (model: Model) => void;
  onDeleteModel: (model: Model) => void;
};

export function BrandsTab({
  isLoading,
  brands,
  filteredModelsByBrandId,
  expandedBrands,
  openMenuKey,
  onToggleBrandExpansion,
  onToggleMenu,
  onOpenAddBrand,
  onOpenAddModel,
  onEditBrand,
  onDeleteBrand,
  onEditModel,
  onDeleteModel,
}: BrandsTabProps) {
  return (
    <AdminSectionCard title="Tags">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-brand-text">Brand And Model Tags</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Canonical storefront taxonomy for brands and sneaker models.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddBrand}
          className={adminButtonStyles.primary}
        >
          Add Brand
        </button>
      </div>

      {isLoading ? (
        <AdminEmptyState
          title="Loading Tags"
          description="Pulling brand and model taxonomy now."
        />
      ) : brands.length === 0 ? (
        <AdminEmptyState
          title="No Tags Found"
          description="Add a brand to start building the catalog taxonomy."
        />
      ) : (
        <div className={catalogStyles.tableWrap}>
          <table className="w-full text-sm">
            <thead>
              <tr className={catalogStyles.tableHeadRow}>
                <th className={catalogStyles.tableHeadCell}>Brand</th>
                <th
                  className={`${catalogStyles.tableHeadCell} hidden text-right sm:table-cell`}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => {
                const visibleModels = filteredModelsByBrandId[brand.id] ?? [];
                const isExpanded = expandedBrands[brand.id] ?? false;

                return (
                  <tr key={brand.id}>
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
                                <AdminStatusBadge
                                  tone={brand.is_active ? "success" : "neutral"}
                                >
                                  {brand.is_active ? "Active" : "Inactive"}
                                </AdminStatusBadge>
                                <AdminStatusBadge
                                  tone={brand.is_verified ? "success" : "warning"}
                                >
                                  {brand.is_verified ? "Verified" : "Unverified"}
                                </AdminStatusBadge>
                              </div>
                              <div className="mt-1 text-xs text-brand-muted">
                                {visibleModels.length} model
                                {visibleModels.length === 1 ? "" : "s"}
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
                          {visibleModels.length === 0 ? (
                            <AdminEmptyState
                              title="No Models Found"
                              description="Add a model for this brand or widen the current filters."
                            />
                          ) : (
                            <div className="space-y-2">
                              {visibleModels.map((model) => (
                                <div
                                  key={model.id}
                                  className="flex flex-col gap-3 border border-brand-border bg-brand-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate font-medium text-brand-text">
                                      {model.canonical_label}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <AdminStatusBadge
                                      tone={model.is_active ? "success" : "neutral"}
                                    >
                                      {model.is_active ? "Active" : "Inactive"}
                                    </AdminStatusBadge>
                                    <AdminStatusBadge
                                      tone={model.is_verified ? "success" : "warning"}
                                    >
                                      {model.is_verified ? "Verified" : "Unverified"}
                                    </AdminStatusBadge>
                                    <CatalogActionMenu
                                      menuKey={`model-${model.id}`}
                                      openMenuKey={openMenuKey}
                                      onToggle={onToggleMenu}
                                      onEdit={() => onEditModel(model)}
                                      onDelete={() => onDeleteModel(model)}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminSectionCard>
  );
}
