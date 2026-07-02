"use client";

import { useEffect, useState } from "react";

import { CatalogTabContent } from "@/components/admin/catalog/CatalogTabContent";
import { CatalogInfoKey } from "@/components/admin/catalog/CatalogInfoKey";
import { buildCatalogEditDraft } from "@/components/admin/catalog/catalogEditState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { useAdminCatalogData } from "@/components/admin/catalog/useAdminCatalogData";
import { useAdminCatalogDerivedState } from "@/components/admin/catalog/useAdminCatalogDerivedState";
import { useAdminCatalogMutations } from "@/components/admin/catalog/useAdminCatalogMutations";

import { CatalogToolbar } from "./components/CatalogToolbar";
import { TagModals } from "./components/TagModals";
import {
  catalogTabs,
  emptyCatalogDraft,
  normalizeLabel,
  toTitleCase,
} from "./catalogConfig";
import type { ActiveTab, Brand, EditTarget, NewAliasDraft, EditDraft } from "./types";

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
    setEditDraft(buildCatalogEditDraft(editTarget));
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

      <CatalogTabContent
        activeTab={activeTab}
        brands={brands}
        expandedBrands={expandedBrands}
        filteredAliases={filteredAliases}
        filteredBrands={filteredBrands}
        filteredCandidates={filteredCandidates}
        filteredModelsByBrandId={filteredModelsByBrandId}
        isLoading={isLoading}
        models={models}
        newAlias={newAlias}
        onAcceptCandidate={(candidate) => {
          void handleAcceptCandidate(candidate);
        }}
        onDeleteAlias={(alias) => setConfirmTarget({ type: "alias", item: alias })}
        onDeleteBrand={(brand) => setConfirmTarget({ type: "brand", item: brand })}
        onDeleteModel={(model) => setConfirmTarget({ type: "model", item: model })}
        onEditAlias={(alias) => setEditTarget({ type: "alias", item: alias })}
        onEditBrand={(brand) => setEditTarget({ type: "brand", item: brand })}
        onEditModel={(model) => setEditTarget({ type: "model", item: model })}
        onNewAliasChange={setNewAlias}
        onOpenAddBrand={openAddBrandModal}
        onOpenAddModel={openAddModelModal}
        onRejectCandidate={(candidate) => {
          void handleRejectCandidate(candidate);
        }}
        onResolveBrandLabel={resolveBrandLabel}
        onResolveModelLabel={resolveModelLabel}
        onToggleBrandExpansion={toggleBrandExpansion}
        onToggleMenu={toggleMenu}
        onToggleCreateAlias={() => {
          void handleCreateAlias();
        }}
        openMenuKey={openMenuKey}
      />

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
