"use client";

import type { Dispatch, SetStateAction } from "react";

import { logError } from "@/lib/utils/log";

import type {
  Alias,
  AliasEditDraft,
  Brand,
  BrandEditDraft,
  Candidate,
  EditDraft,
  EditTarget,
  Model,
  ModelEditDraft,
  NewAliasDraft,
} from "./types";

type CatalogMutationDrafts = {
  brand: { label: string };
  model: { brandId: string; label: string };
  alias: NewAliasDraft;
};

type UseAdminCatalogMutationsArgs = {
  defaultGroupId: string | null;
  brands: Brand[];
  models: Model[];
  aliases: Alias[];
  newBrand: { label: string };
  newModel: { brandId: string; label: string };
  newAlias: NewAliasDraft;
  editTarget: EditTarget | null;
  editDraft: EditDraft | null;
  confirmTarget: EditTarget | null;
  emptyDrafts: CatalogMutationDrafts;
  normalizeLabel: (value: string) => string;
  toTitleCase: (value: string) => string;
  loadAll: () => Promise<void>;
  setMessage: Dispatch<SetStateAction<string>>;
  setNewBrand: Dispatch<SetStateAction<{ label: string }>>;
  setNewModel: Dispatch<SetStateAction<{ brandId: string; label: string }>>;
  setNewAlias: Dispatch<SetStateAction<NewAliasDraft>>;
  setEditTarget: Dispatch<SetStateAction<EditTarget | null>>;
  setConfirmTarget: Dispatch<SetStateAction<EditTarget | null>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setShowAddBrandModal: Dispatch<SetStateAction<boolean>>;
  setShowAddModelModal: Dispatch<SetStateAction<boolean>>;
  setModelTargetBrand: Dispatch<SetStateAction<Brand | null>>;
};

export function useAdminCatalogMutations({
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
  emptyDrafts,
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
}: UseAdminCatalogMutationsArgs) {
  const handleCreateBrand = async () => {
    if (!newBrand.label.trim()) {
      setMessage("Brand label is required.");
      return;
    }
    if (!defaultGroupId) {
      setMessage("Unable to create brand: missing default configuration.");
      return;
    }

    const formattedLabel = toTitleCase(newBrand.label);
    const normalized = normalizeLabel(formattedLabel);
    const isDuplicate = brands.some(
      (brand) => normalizeLabel(brand.canonical_label) === normalized,
    );

    if (isDuplicate) {
      setMessage("Brand already exists.");
      return;
    }

    const response = await fetch("/api/admin/catalog/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: defaultGroupId, canonicalLabel: formattedLabel }),
    });

    if (!response.ok) {
      setMessage("Failed to create brand.");
      return;
    }

    setNewBrand(emptyDrafts.brand);
    setShowAddBrandModal(false);
    await loadAll();
  };

  const handleCreateModel = async () => {
    if (!newModel.brandId || !newModel.label.trim()) {
      setMessage("Brand and model label are required.");
      return;
    }

    const formattedLabel = toTitleCase(newModel.label);
    const normalized = normalizeLabel(formattedLabel);
    const isDuplicate = models.some(
      (model) =>
        model.brand_id === newModel.brandId &&
        normalizeLabel(model.canonical_label) === normalized,
    );

    if (isDuplicate) {
      setMessage("Model already exists for this brand.");
      return;
    }

    const response = await fetch("/api/admin/catalog/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId: newModel.brandId, canonicalLabel: formattedLabel }),
    });

    if (!response.ok) {
      setMessage("Failed to create model.");
      return;
    }

    setNewModel(emptyDrafts.model);
    setShowAddModelModal(false);
    setModelTargetBrand(null);
    await loadAll();
  };

  const handleCreateAlias = async () => {
    if (!newAlias.label.trim() || !newAlias.entityId) {
      setMessage("Alias label and entity are required.");
      return;
    }

    const normalized = normalizeLabel(newAlias.label);
    const isDuplicate = aliases.some((alias) => {
      const targetId = alias.entity_type === "brand" ? alias.brand_id : alias.model_id;

      return (
        alias.entity_type === newAlias.entityType &&
        targetId === newAlias.entityId &&
        normalizeLabel(alias.alias_label) === normalized
      );
    });

    if (isDuplicate) {
      setMessage("Alias already exists for that item.");
      return;
    }

    const response = await fetch("/api/admin/catalog/aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: newAlias.entityType,
        brandId: newAlias.entityType === "brand" ? newAlias.entityId : null,
        modelId: newAlias.entityType === "model" ? newAlias.entityId : null,
        aliasLabel: newAlias.label.trim(),
        priority: Number(newAlias.priority || 0),
      }),
    });

    if (!response.ok) {
      setMessage("Failed to create alias.");
      return;
    }

    setNewAlias(emptyDrafts.alias);
    await loadAll();
  };

  const handleAcceptCandidate = async (candidate: Candidate) => {
    if (candidate.entity_type === "brand" && !defaultGroupId) {
      setMessage("Unable to accept brand candidate: missing default configuration.");
      return;
    }

    const payload =
      candidate.entity_type === "brand" && defaultGroupId
        ? { groupId: defaultGroupId }
        : {};
    const response = await fetch(`/api/admin/catalog/candidates/${candidate.id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setMessage("Failed to accept candidate.");
      return;
    }

    await loadAll();
  };

  const handleRejectCandidate = async (candidate: Candidate) => {
    const response = await fetch(`/api/admin/catalog/candidates/${candidate.id}/reject`, {
      method: "POST",
    });

    if (!response.ok) {
      setMessage("Failed to reject candidate.");
      return;
    }

    await loadAll();
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !editDraft) {
      return;
    }

    setMessage("");

    if (editTarget.type === "brand") {
      const draft = editDraft as BrandEditDraft;
      const normalized = normalizeLabel(draft.canonical_label ?? "");

      if (!normalized) {
        setMessage("Brand label is required.");
        return;
      }

      const isDuplicate = brands.some(
        (brand) =>
          brand.id !== editTarget.item.id &&
          normalizeLabel(brand.canonical_label) === normalized,
      );

      if (isDuplicate) {
        setMessage("Brand already exists.");
        return;
      }
    }

    if (editTarget.type === "model") {
      const draft = editDraft as ModelEditDraft;
      const normalized = normalizeLabel(draft.canonical_label ?? "");

      if (!normalized || !draft.brand_id) {
        setMessage("Brand and model label are required.");
        return;
      }

      const isDuplicate = models.some(
        (model) =>
          model.id !== editTarget.item.id &&
          model.brand_id === draft.brand_id &&
          normalizeLabel(model.canonical_label) === normalized,
      );

      if (isDuplicate) {
        setMessage("Model already exists for this brand.");
        return;
      }
    }

    if (editTarget.type === "alias") {
      const draft = editDraft as AliasEditDraft;
      const normalized = normalizeLabel(draft.alias_label ?? "");

      if (!normalized) {
        setMessage("Alias label is required.");
        return;
      }

      const targetId =
        editTarget.item.entity_type === "brand"
          ? editTarget.item.brand_id
          : editTarget.item.model_id;
      const isDuplicate = aliases.some((alias) => {
        const aliasTargetId =
          alias.entity_type === "brand" ? alias.brand_id : alias.model_id;

        return (
          alias.id !== editTarget.item.id &&
          alias.entity_type === editTarget.item.entity_type &&
          aliasTargetId === targetId &&
          normalizeLabel(alias.alias_label) === normalized
        );
      });

      if (isDuplicate) {
        setMessage("Alias already exists for that item.");
        return;
      }
    }

    setIsSaving(true);

    try {
      if (editTarget.type === "brand") {
        const draft = editDraft as BrandEditDraft;
        await fetch(`/api/admin/catalog/brands/${editTarget.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canonicalLabel: draft.canonical_label,
            isActive: draft.is_active,
            isVerified: draft.is_verified,
          }),
        });
      }

      if (editTarget.type === "model") {
        const draft = editDraft as ModelEditDraft;
        await fetch(`/api/admin/catalog/models/${editTarget.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId: draft.brand_id,
            canonicalLabel: draft.canonical_label,
            isActive: draft.is_active,
            isVerified: draft.is_verified,
          }),
        });
      }

      if (editTarget.type === "alias") {
        const draft = editDraft as AliasEditDraft;
        await fetch(`/api/admin/catalog/aliases/${editTarget.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aliasLabel: draft.alias_label,
            priority: draft.priority ?? 0,
            isActive: draft.is_active,
          }),
        });
      }

      await loadAll();
      setEditTarget(null);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_save_catalog_edit" });
      setMessage("Failed to update tag entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (confirmTarget.type === "brand") {
        await fetch(`/api/admin/catalog/brands/${confirmTarget.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
      }

      if (confirmTarget.type === "model") {
        await fetch(`/api/admin/catalog/models/${confirmTarget.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
      }

      if (confirmTarget.type === "alias") {
        await fetch(`/api/admin/catalog/aliases/${confirmTarget.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
      }

      await loadAll();
      setConfirmTarget(null);
    } catch (error) {
      logError(error, { layer: "frontend", event: "admin_delete_catalog" });
      setMessage("Failed to delete tag entry.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    handleAcceptCandidate,
    handleConfirmDelete,
    handleCreateAlias,
    handleCreateBrand,
    handleCreateModel,
    handleRejectCandidate,
    handleSaveEdit,
  };
}
