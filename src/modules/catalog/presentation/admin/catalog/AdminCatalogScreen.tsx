"use client";

import { useState } from "react";

import { CatalogTabContent } from "@/components/admin/catalog/CatalogTabContent";
import { CatalogInfoKey } from "@/components/admin/catalog/CatalogInfoKey";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { useAdminCatalogData } from "@/modules/catalog/presentation/admin/catalog/useAdminCatalogData";
import { useAdminCatalogDerivedState } from "@/modules/catalog/presentation/admin/catalog/useAdminCatalogDerivedState";
import { useAdminCatalogMutations } from "@/modules/catalog/presentation/admin/catalog/useAdminCatalogMutations";
import { useAdminCatalogScreenState } from "@/modules/catalog/presentation/admin/catalog/useAdminCatalogScreenState";

import { CatalogToolbar } from "@/components/admin/catalog/components/CatalogToolbar";
import { TagModals } from "@/components/admin/catalog/components/TagModals";
import {
  catalogTabs,
  emptyCatalogDraft,
  normalizeLabel,
  toTitleCase,
} from "@/components/admin/catalog/catalogConfig";
import type { EditTarget } from "@/components/admin/catalog/types";

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

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const {
    activeTab,
    confirmTarget,
    editDraft,
    expandedBrands,
    isSaving,
    modelTargetBrand,
    newAlias,
    newBrand,
    newModel,
    openMenuKey,
    openAddBrandModal,
    openAddModelModal,
    query,
    setActiveTab,
    setConfirmTarget,
    setEditDraft,
    setIsSaving,
    setModelTargetBrand,
    setNewAlias,
    setNewBrand,
    setNewModel,
    setOpenMenuKey,
    setQuery,
    setShowAddBrandModal,
    setShowAddModelModal,
    setShowInactive,
    setShowUnverified,
    showAddBrandModal,
    showAddModelModal,
    showInactive,
    showUnverified,
    toggleBrandExpansion,
    toggleMenu,
  } = useAdminCatalogScreenState({
    editTarget,
    loadAll,
  });

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
