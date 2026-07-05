"use client";

import { AliasesTab } from "@/modules/catalog/presentation/admin/catalog/components/AliasesTab";
import { BrandsTab } from "@/modules/catalog/presentation/admin/catalog/components/BrandsTab";
import { CandidatesTab } from "@/modules/catalog/presentation/admin/catalog/components/CandidatesTab";
import type {
  ActiveTab,
  Alias,
  Brand,
  Candidate,
  Model,
  NewAliasDraft,
} from "@/modules/catalog/presentation/admin/catalog/types";

type CatalogTabContentProps = {
  activeTab: ActiveTab;
  brands: Brand[];
  expandedBrands: Record<string, boolean>;
  filteredAliases: Alias[];
  filteredBrands: Brand[];
  filteredCandidates: Candidate[];
  filteredModelsByBrandId: Record<string, Model[]>;
  isLoading: boolean;
  models: Model[];
  newAlias: NewAliasDraft;
  onAcceptCandidate: (candidate: Candidate) => void;
  onDeleteAlias: (alias: Alias) => void;
  onDeleteBrand: (brand: Brand) => void;
  onDeleteModel: (model: Model) => void;
  onEditAlias: (alias: Alias) => void;
  onEditBrand: (brand: Brand) => void;
  onEditModel: (model: Model) => void;
  onNewAliasChange: React.Dispatch<React.SetStateAction<NewAliasDraft>>;
  onOpenAddBrand: () => void;
  onOpenAddModel: (brand: Brand) => void;
  onRejectCandidate: (candidate: Candidate) => void;
  onResolveBrandLabel: (brandId?: string | null) => string;
  onResolveModelLabel: (modelId?: string | null) => string;
  onToggleBrandExpansion: (brandId: string) => void;
  onToggleMenu: (key: string) => void;
  onToggleCreateAlias: () => void;
  openMenuKey: string | null;
};

export function CatalogTabContent({
  activeTab,
  brands,
  expandedBrands,
  filteredAliases,
  filteredBrands,
  filteredCandidates,
  filteredModelsByBrandId,
  isLoading,
  models,
  newAlias,
  onAcceptCandidate,
  onDeleteAlias,
  onDeleteBrand,
  onDeleteModel,
  onEditAlias,
  onEditBrand,
  onEditModel,
  onNewAliasChange,
  onOpenAddBrand,
  onOpenAddModel,
  onRejectCandidate,
  onResolveBrandLabel,
  onResolveModelLabel,
  onToggleBrandExpansion,
  onToggleMenu,
  onToggleCreateAlias,
  openMenuKey,
}: CatalogTabContentProps) {
  if (activeTab === "brands") {
    return (
      <BrandsTab
        isLoading={isLoading}
        brands={filteredBrands}
        filteredModelsByBrandId={filteredModelsByBrandId}
        expandedBrands={expandedBrands}
        openMenuKey={openMenuKey}
        onToggleBrandExpansion={onToggleBrandExpansion}
        onToggleMenu={onToggleMenu}
        onOpenAddBrand={onOpenAddBrand}
        onOpenAddModel={onOpenAddModel}
        onEditBrand={onEditBrand}
        onDeleteBrand={onDeleteBrand}
        onEditModel={onEditModel}
        onDeleteModel={onDeleteModel}
      />
    );
  }

  if (activeTab === "aliases") {
    return (
      <AliasesTab
        isLoading={isLoading}
        aliases={filteredAliases}
        brands={brands}
        models={models}
        newAlias={newAlias}
        openMenuKey={openMenuKey}
        onToggleMenu={onToggleMenu}
        onNewAliasChange={onNewAliasChange}
        onCreateAlias={onToggleCreateAlias}
        onEditAlias={onEditAlias}
        onDeleteAlias={onDeleteAlias}
        resolveBrandLabel={onResolveBrandLabel}
        resolveModelLabel={onResolveModelLabel}
      />
    );
  }

  return (
    <CandidatesTab
      isLoading={isLoading}
      candidates={filteredCandidates}
      onAcceptCandidate={onAcceptCandidate}
      onRejectCandidate={onRejectCandidate}
      resolveBrandLabel={onResolveBrandLabel}
    />
  );
}
