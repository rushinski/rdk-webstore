import type { Dispatch, SetStateAction } from "react";

import { adminButtonStyles } from "@/modules/shared/presentation/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/modules/shared/presentation/admin/ui/adminFormStyles";
import type { Brand } from "@/modules/catalog/presentation/admin/catalog/types";
import { TagModalShell } from "@/modules/catalog/presentation/admin/catalog/components/TagModalShell";

type CreateTagModalsProps = {
  modelTargetBrand: Brand | null;
  newBrand: { label: string };
  newModel: { brandId: string; label: string };
  onCreateBrand: () => void;
  onCreateModel: () => void;
  setModelTargetBrand: (value: Brand | null) => void;
  setNewBrand: Dispatch<SetStateAction<{ label: string }>>;
  setNewModel: Dispatch<SetStateAction<{ brandId: string; label: string }>>;
  setShowAddBrandModal: (value: boolean) => void;
  setShowAddModelModal: (value: boolean) => void;
  showAddBrandModal: boolean;
  showAddModelModal: boolean;
  toTitleCase: (value: string) => string;
};

export function CreateTagModals({
  modelTargetBrand,
  newBrand,
  newModel,
  onCreateBrand,
  onCreateModel,
  setModelTargetBrand,
  setNewBrand,
  setNewModel,
  setShowAddBrandModal,
  setShowAddModelModal,
  showAddBrandModal,
  showAddModelModal,
  toTitleCase,
}: CreateTagModalsProps) {
  return (
    <>
      {showAddBrandModal ? (
        <TagModalShell
          title="Add Brand"
          description="Create a new canonical brand label for catalog parsing and storefront filters."
          onClose={() => setShowAddBrandModal(false)}
        >
          <input
            value={newBrand.label}
            onChange={(event) =>
              setNewBrand((current) => ({ ...current, label: event.target.value }))
            }
            onBlur={(event) =>
              setNewBrand((current) => ({
                ...current,
                label: toTitleCase(event.target.value),
              }))
            }
            placeholder="Brand label"
            className={adminFormStyles.input}
          />

          <div className="flex items-center justify-end gap-3 border-t border-brand-border pt-4">
            <button
              type="button"
              onClick={() => setShowAddBrandModal(false)}
              className={adminButtonStyles.secondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCreateBrand}
              className={adminButtonStyles.primary}
            >
              Add Brand
            </button>
          </div>
        </TagModalShell>
      ) : null}

      {showAddModelModal && modelTargetBrand ? (
        <TagModalShell
          title="Add Model"
          description={`Brand: ${modelTargetBrand.canonical_label}`}
          onClose={() => {
            setShowAddModelModal(false);
            setModelTargetBrand(null);
          }}
        >
          <input
            value={newModel.label}
            onChange={(event) =>
              setNewModel((current) => ({ ...current, label: event.target.value }))
            }
            onBlur={(event) =>
              setNewModel((current) => ({
                ...current,
                label: toTitleCase(event.target.value),
              }))
            }
            placeholder="Model label"
            className={adminFormStyles.input}
          />

          <div className="flex items-center justify-end gap-3 border-t border-brand-border pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddModelModal(false);
                setModelTargetBrand(null);
              }}
              className={adminButtonStyles.secondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCreateModel}
              className={adminButtonStyles.primary}
            >
              Add Model
            </button>
          </div>
        </TagModalShell>
      ) : null}
    </>
  );
}

