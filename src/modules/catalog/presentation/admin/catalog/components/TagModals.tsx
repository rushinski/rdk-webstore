"use client";

import type { Dispatch, SetStateAction } from "react";

import { ConfirmDisableTagModal } from "@/components/admin/catalog/components/ConfirmDisableTagModal";
import { CreateTagModals } from "@/components/admin/catalog/components/CreateTagModals";
import { EditTagModal } from "@/components/admin/catalog/components/EditTagModal";
import type {
  Brand,
  EditDraft,
  EditTarget,
} from "@/modules/catalog/presentation/admin/catalog/types";

type TagModalsProps = {
  showAddBrandModal: boolean;
  showAddModelModal: boolean;
  editTarget: EditTarget | null;
  editDraft: EditDraft | null;
  confirmTarget: EditTarget | null;
  isSaving: boolean;
  brands: Brand[];
  modelTargetBrand: Brand | null;
  newBrand: { label: string };
  newModel: { brandId: string; label: string };
  setNewBrand: Dispatch<SetStateAction<{ label: string }>>;
  setNewModel: Dispatch<SetStateAction<{ brandId: string; label: string }>>;
  setShowAddBrandModal: (value: boolean) => void;
  setShowAddModelModal: (value: boolean) => void;
  setModelTargetBrand: (value: Brand | null) => void;
  setEditTarget: (value: EditTarget | null) => void;
  setEditDraft: Dispatch<SetStateAction<EditDraft | null>>;
  setConfirmTarget: (value: EditTarget | null) => void;
  onCreateBrand: () => void;
  onCreateModel: () => void;
  onSaveEdit: () => void;
  onConfirmDelete: () => void;
  toTitleCase: (value: string) => string;
};

export function TagModals({
  showAddBrandModal,
  showAddModelModal,
  editTarget,
  editDraft,
  confirmTarget,
  isSaving,
  brands,
  modelTargetBrand,
  newBrand,
  newModel,
  setNewBrand,
  setNewModel,
  setShowAddBrandModal,
  setShowAddModelModal,
  setModelTargetBrand,
  setEditTarget,
  setEditDraft,
  setConfirmTarget,
  onCreateBrand,
  onCreateModel,
  onSaveEdit,
  onConfirmDelete,
  toTitleCase,
}: TagModalsProps) {
  return (
    <>
      <CreateTagModals
        modelTargetBrand={modelTargetBrand}
        newBrand={newBrand}
        newModel={newModel}
        onCreateBrand={onCreateBrand}
        onCreateModel={onCreateModel}
        setModelTargetBrand={setModelTargetBrand}
        setNewBrand={setNewBrand}
        setNewModel={setNewModel}
        setShowAddBrandModal={setShowAddBrandModal}
        setShowAddModelModal={setShowAddModelModal}
        showAddBrandModal={showAddBrandModal}
        showAddModelModal={showAddModelModal}
        toTitleCase={toTitleCase}
      />

      <EditTagModal
        brands={brands}
        editDraft={editDraft}
        editTarget={editTarget}
        isSaving={isSaving}
        onSaveEdit={onSaveEdit}
        setEditDraft={setEditDraft}
        setEditTarget={setEditTarget}
      />

      <ConfirmDisableTagModal
        confirmTarget={confirmTarget}
        isSaving={isSaving}
        onConfirmDelete={onConfirmDelete}
        setConfirmTarget={setConfirmTarget}
      />
    </>
  );
}
