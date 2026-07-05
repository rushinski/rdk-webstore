"use client";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { CatalogBrandRow } from "@/modules/catalog/presentation/admin/catalog/components/CatalogBrandRow";
import { catalogStyles } from "@/modules/catalog/presentation/admin/catalog/components/catalogStyles";
import type { Brand, Model } from "@/modules/catalog/presentation/admin/catalog/types";

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
        <button type="button" onClick={onOpenAddBrand} className={adminButtonStyles.primary}>
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
                <th className={`${catalogStyles.tableHeadCell} hidden text-right sm:table-cell`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => {
                const visibleModels = filteredModelsByBrandId[brand.id] ?? [];
                const isExpanded = expandedBrands[brand.id] ?? false;

                return (
                  <CatalogBrandRow
                    key={brand.id}
                    brand={brand}
                    isExpanded={isExpanded}
                    models={visibleModels}
                    onDeleteBrand={onDeleteBrand}
                    onDeleteModel={onDeleteModel}
                    onEditBrand={onEditBrand}
                    onEditModel={onEditModel}
                    onOpenAddModel={onOpenAddModel}
                    onToggleBrandExpansion={onToggleBrandExpansion}
                    onToggleMenu={onToggleMenu}
                    openMenuKey={openMenuKey}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminSectionCard>
  );
}
