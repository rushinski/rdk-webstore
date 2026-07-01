"use client";

import { useEffect, useState } from "react";

import { CatalogInfoKey } from "@/components/admin/catalog/CatalogInfoKey";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { useAdminCatalogData } from "@/components/admin/catalog/useAdminCatalogData";
import { useAdminCatalogDerivedState } from "@/components/admin/catalog/useAdminCatalogDerivedState";
import { useAdminCatalogMutations } from "@/components/admin/catalog/useAdminCatalogMutations";

import { AliasesTab } from "./components/AliasesTab";
import { BrandsTab } from "./components/BrandsTab";
import { CandidatesTab } from "./components/CandidatesTab";
import { CatalogToolbar } from "./components/CatalogToolbar";
import { TagModals } from "./components/TagModals";
import {
  catalogTabs,
  emptyCatalogDraft,
  normalizeLabel,
  toTitleCase,
} from "./catalogConfig";
import type {
  ActiveTab,
  AliasEditDraft,
  Brand,
  BrandEditDraft,
  EditDraft,
  EditTarget,
  ModelEditDraft,
  NewAliasDraft,
} from "./types";

export function AdminCatalogScreen() {
  const {
    groups,
    brands,
    models,
    aliases,
    candidates,
    message,
    isLoading,
    loadAll,
    setMessage,
  } = useAdminCatalogData();

  const [activeTab, setActiveTab] = useState<ActiveTab>("brands");
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showUnverified, setShowUnverified] = useState(true);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const [newBrand, setNewBrand] = useState(emptyCatalogDraft.brand);
  const [newModel, setNewModel] = useState(emptyCatalogDraft.model);
  const [newAlias, setNewAlias] = useState<NewAliasDraft>(emptyCatalogDraft.alias);

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<EditTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [modelTargetBrand, setModelTargetBrand] = useState<Brand | null>(null);
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  const {
    counts,
    defaultGroupId,
    filteredAliases,
    filteredBrands,
    filteredCandidates,
    filteredModelsByBrandId,
    resolveBrandLabel,
    resolveModelLabel,
  } = useAdminCatalogDerivedState({
    groups,
    brands,
    models,
    aliases,
    candidates,
    query,
    showInactive,
    showUnverified,
  });

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!editTarget) {
      setEditDraft(null);
      return;
    }

    if (editTarget.type === "brand") {
      const draft: BrandEditDraft = {
        canonical_label: editTarget.item.canonical_label,
        is_active: editTarget.item.is_active,
        is_verified: editTarget.item.is_verified,
      };
      setEditDraft(draft);
    }

    if (editTarget.type === "model") {
      const draft: ModelEditDraft = {
        canonical_label: editTarget.item.canonical_label,
        brand_id: editTarget.item.brand_id,
        is_active: editTarget.item.is_active,
        is_verified: editTarget.item.is_verified,
      };
      setEditDraft(draft);
    }

    if (editTarget.type === "alias") {
      const draft: AliasEditDraft = {
        alias_label: editTarget.item.alias_label,
        priority: editTarget.item.priority ?? 0,
        is_active: editTarget.item.is_active,
      };
      setEditDraft(draft);
    }
  }, [editTarget]);

  const toggleMenu = (key: string) => {
    setOpenMenuKey((current) => (current === key ? null : key));
  };

  const toggleBrandExpansion = (brandId: string) => {
    setExpandedBrands((current) => ({ ...current, [brandId]: !current[brandId] }));
  };

  const openAddBrandModal = () => {
    setNewBrand(emptyCatalogDraft.brand);
    setShowAddBrandModal(true);
  };

  const openAddModelModal = (brand: Brand) => {
    setModelTargetBrand(brand);
    setNewModel({ ...emptyCatalogDraft.model, brandId: brand.id });
    setShowAddModelModal(true);
  };

  const {
    handleAcceptCandidate,
    handleConfirmDelete,
    handleCreateAlias,
    handleCreateBrand,
    handleCreateModel,
    handleRejectCandidate,
    handleSaveEdit,
  } = useAdminCatalogMutations({
    defaultGroupId,
    brands,
    models,
    aliases,
    newBrand,
    newModel,
    newAlias,
    editTarget,
    editDraft,
    confirmTarget,
    emptyDrafts: emptyCatalogDraft,
    normalizeLabel,
    toTitleCase,
    loadAll,
    setMessage,
    setNewBrand,
    setNewModel,
    setNewAlias,
    setEditTarget,
    setConfirmTarget,
    setIsSaving,
    setShowAddBrandModal,
    setShowAddModelModal,
    setModelTargetBrand,
  });

  return (
    <div
      className="space-y-6"
      onClick={() => {
        setOpenMenuKey(null);
      }}
    >
      <AdminPageHeader
        title="Catalog"
        description="Manage canonical tags, alias mappings, and parser candidates with a single shared admin workflow."
      />

      {message ? (
        <div className="border border-brand-border bg-brand-page px-4 py-3 text-sm text-brand-text">
          {message}
        </div>
      ) : null}

      <CatalogInfoKey />

      <CatalogToolbar
        activeTab={activeTab}
        tabs={catalogTabs}
        query={query}
        showInactive={showInactive}
        showUnverified={showUnverified}
        counts={counts}
        onTabChange={setActiveTab}
        onQueryChange={setQuery}
        onShowInactiveChange={setShowInactive}
        onShowUnverifiedChange={setShowUnverified}
      />

      {activeTab === "brands" ? (
        <BrandsTab
          isLoading={isLoading}
          brands={filteredBrands}
          filteredModelsByBrandId={filteredModelsByBrandId}
          expandedBrands={expandedBrands}
          openMenuKey={openMenuKey}
          onToggleBrandExpansion={toggleBrandExpansion}
          onToggleMenu={toggleMenu}
          onOpenAddBrand={openAddBrandModal}
          onOpenAddModel={openAddModelModal}
          onEditBrand={(brand) => setEditTarget({ type: "brand", item: brand })}
          onDeleteBrand={(brand) => setConfirmTarget({ type: "brand", item: brand })}
          onEditModel={(model) => setEditTarget({ type: "model", item: model })}
          onDeleteModel={(model) => setConfirmTarget({ type: "model", item: model })}
        />
      ) : null}

      {activeTab === "aliases" ? (
        <AliasesTab
          isLoading={isLoading}
          aliases={filteredAliases}
          brands={brands}
          models={models}
          newAlias={newAlias}
          openMenuKey={openMenuKey}
          onToggleMenu={toggleMenu}
          onNewAliasChange={setNewAlias}
          onCreateAlias={() => {
            void handleCreateAlias();
          }}
          onEditAlias={(alias) => setEditTarget({ type: "alias", item: alias })}
          onDeleteAlias={(alias) => setConfirmTarget({ type: "alias", item: alias })}
          resolveBrandLabel={resolveBrandLabel}
          resolveModelLabel={resolveModelLabel}
        />
      ) : null}

      {activeTab === "candidates" ? (
        <CandidatesTab
          isLoading={isLoading}
          candidates={filteredCandidates}
          onAcceptCandidate={(candidate) => {
            void handleAcceptCandidate(candidate);
          }}
          onRejectCandidate={(candidate) => {
            void handleRejectCandidate(candidate);
          }}
          resolveBrandLabel={resolveBrandLabel}
        />
      ) : null}

      <TagModals
        showAddBrandModal={showAddBrandModal}
        showAddModelModal={showAddModelModal}
        editTarget={editTarget}
        editDraft={editDraft}
        confirmTarget={confirmTarget}
        isSaving={isSaving}
        brands={brands}
        modelTargetBrand={modelTargetBrand}
        newBrand={newBrand}
        newModel={newModel}
        setNewBrand={setNewBrand}
        setNewModel={setNewModel}
        setShowAddBrandModal={setShowAddBrandModal}
        setShowAddModelModal={setShowAddModelModal}
        setModelTargetBrand={setModelTargetBrand}
        setEditTarget={setEditTarget}
        setEditDraft={setEditDraft}
        setConfirmTarget={setConfirmTarget}
        onCreateBrand={() => {
          void handleCreateBrand();
        }}
        onCreateModel={() => {
          void handleCreateModel();
        }}
        onSaveEdit={() => {
          void handleSaveEdit();
        }}
        onConfirmDelete={() => {
          void handleConfirmDelete();
        }}
        toTitleCase={toTitleCase}
      />
    </div>
  );
}
