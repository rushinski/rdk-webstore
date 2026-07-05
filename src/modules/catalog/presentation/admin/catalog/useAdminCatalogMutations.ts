"use client";

import type { Dispatch, SetStateAction } from "react";

import { logError } from "@/lib/utils/log";
import {
  acceptCatalogCandidateRequest,
  createCatalogAliasRequest,
  createCatalogBrandRequest,
  createCatalogModelRequest,
  rejectCatalogCandidateRequest,
  updateCatalogAliasRequest,
  updateCatalogBrandRequest,
  updateCatalogModelRequest,
} from "@/components/admin/catalog/catalogMutationRequests";
import {
  validateCatalogEdit,
  validateCreateAlias,
  validateCreateBrand,
  validateCreateModel,
} from "@/components/admin/catalog/catalogMutationValidation";

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
} from "@/modules/catalog/presentation/admin/catalog/types";

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
    const result = validateCreateBrand({
      brands,
      defaultGroupId,
      label: newBrand.label,
      normalizeLabel,
      toTitleCase,
    });
    if (result.error) {
      setMessage(result.error);
      return;
    }
    const formattedLabel = result.formattedLabel as string;

    const response = await createCatalogBrandRequest({
      canonicalLabel: formattedLabel,
      groupId: defaultGroupId as string,
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
    const result = validateCreateModel({
      brandId: newModel.brandId,
      label: newModel.label,
      models,
      normalizeLabel,
      toTitleCase,
    });
    if (result.error) {
      setMessage(result.error);
      return;
    }
    const formattedLabel = result.formattedLabel as string;

    const response = await createCatalogModelRequest({
      brandId: newModel.brandId,
      canonicalLabel: formattedLabel,
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
    const result = validateCreateAlias({
      aliases,
      newAlias,
      normalizeLabel,
    });
    if (result.error) {
      setMessage(result.error);
      return;
    }

    const response = await createCatalogAliasRequest({
      entityType: newAlias.entityType,
      brandId: newAlias.entityType === "brand" ? newAlias.entityId : null,
      modelId: newAlias.entityType === "model" ? newAlias.entityId : null,
      aliasLabel: newAlias.label.trim(),
      priority: Number(newAlias.priority || 0),
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

    const response = await acceptCatalogCandidateRequest(candidate, defaultGroupId);

    if (!response.ok) {
      setMessage("Failed to accept candidate.");
      return;
    }

    await loadAll();
  };

  const handleRejectCandidate = async (candidate: Candidate) => {
    const response = await rejectCatalogCandidateRequest(candidate.id);

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
    const validation = validateCatalogEdit({
      aliases,
      brands,
      editDraft,
      editTarget,
      models,
      normalizeLabel,
    });
    if (validation.error) {
      setMessage(validation.error);
      return;
    }

    setIsSaving(true);

    try {
      if (editTarget.type === "brand") {
        const draft = editDraft as BrandEditDraft;
        await updateCatalogBrandRequest(editTarget.item.id, {
          canonicalLabel: draft.canonical_label,
          isActive: draft.is_active,
          isVerified: draft.is_verified,
        });
      }

      if (editTarget.type === "model") {
        const draft = editDraft as ModelEditDraft;
        await updateCatalogModelRequest(editTarget.item.id, {
          brandId: draft.brand_id,
          canonicalLabel: draft.canonical_label,
          isActive: draft.is_active,
          isVerified: draft.is_verified,
        });
      }

      if (editTarget.type === "alias") {
        const draft = editDraft as AliasEditDraft;
        await updateCatalogAliasRequest(editTarget.item.id, {
          aliasLabel: draft.alias_label,
          priority: draft.priority ?? 0,
          isActive: draft.is_active,
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
        const item = confirmTarget.item;
        await updateCatalogBrandRequest(item.id, {
          canonicalLabel: item.canonical_label,
          isActive: false,
          isVerified: item.is_verified,
        });
      }

      if (confirmTarget.type === "model") {
        const item = confirmTarget.item;
        await updateCatalogModelRequest(item.id, {
          brandId: item.brand_id,
          canonicalLabel: item.canonical_label,
          isActive: false,
          isVerified: item.is_verified,
        });
      }

      if (confirmTarget.type === "alias") {
        const item = confirmTarget.item;
        await updateCatalogAliasRequest(item.id, {
          aliasLabel: item.alias_label,
          priority: item.priority ?? 0,
          isActive: false,
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
