import type { Dispatch, SetStateAction } from "react";

import { adminButtonStyles } from "@/modules/shared/presentation/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/modules/shared/presentation/admin/ui/adminFormStyles";
import { RdkSelect } from "@/components/ui/Select";
import type {
  AliasEditDraft,
  Brand,
  BrandEditDraft,
  EditDraft,
  EditTarget,
  ModelEditDraft,
} from "@/modules/catalog/presentation/admin/catalog/types";
import { TagModalShell } from "@/modules/catalog/presentation/admin/catalog/components/TagModalShell";

type EditTagModalProps = {
  brands: Brand[];
  editDraft: EditDraft | null;
  editTarget: EditTarget | null;
  isSaving: boolean;
  onSaveEdit: () => void;
  setEditDraft: Dispatch<SetStateAction<EditDraft | null>>;
  setEditTarget: (value: EditTarget | null) => void;
};

export function EditTagModal({
  brands,
  editDraft,
  editTarget,
  isSaving,
  onSaveEdit,
  setEditDraft,
  setEditTarget,
}: EditTagModalProps) {
  if (!editTarget || !editDraft) {
    return null;
  }

  return (
    <TagModalShell
      title={`Edit ${editTarget.type}`}
      description="Update the canonical record without changing the surrounding workflow."
      onClose={() => setEditTarget(null)}
    >
      {editTarget.type === "brand"
        ? (() => {
            const draft = editDraft as BrandEditDraft;

            return (
              <div className="space-y-4">
                <input
                  value={draft.canonical_label}
                  onChange={(event) =>
                    setEditDraft({ ...draft, canonical_label: event.target.value })
                  }
                  placeholder="Brand label"
                  className={adminFormStyles.input}
                />
                <div className="flex flex-wrap gap-4 text-sm text-brand-text">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rdk-checkbox"
                      checked={draft.is_active}
                      onChange={(event) =>
                        setEditDraft({ ...draft, is_active: event.target.checked })
                      }
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rdk-checkbox"
                      checked={draft.is_verified}
                      onChange={(event) =>
                        setEditDraft({ ...draft, is_verified: event.target.checked })
                      }
                    />
                    Verified
                  </label>
                </div>
              </div>
            );
          })()
        : null}

      {editTarget.type === "model"
        ? (() => {
            const draft = editDraft as ModelEditDraft;

            return (
              <div className="space-y-4">
                <RdkSelect
                  value={draft.brand_id}
                  onChange={(value) => setEditDraft({ ...draft, brand_id: value })}
                  options={brands.map((brand) => ({
                    value: brand.id,
                    label: brand.canonical_label,
                  }))}
                />
                <input
                  value={draft.canonical_label}
                  onChange={(event) =>
                    setEditDraft({ ...draft, canonical_label: event.target.value })
                  }
                  placeholder="Model label"
                  className={adminFormStyles.input}
                />
                <div className="flex flex-wrap gap-4 text-sm text-brand-text">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rdk-checkbox"
                      checked={draft.is_active}
                      onChange={(event) =>
                        setEditDraft({ ...draft, is_active: event.target.checked })
                      }
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rdk-checkbox"
                      checked={draft.is_verified}
                      onChange={(event) =>
                        setEditDraft({ ...draft, is_verified: event.target.checked })
                      }
                    />
                    Verified
                  </label>
                </div>
              </div>
            );
          })()
        : null}

      {editTarget.type === "alias"
        ? (() => {
            const draft = editDraft as AliasEditDraft;

            return (
              <div className="space-y-4">
                <input
                  value={draft.alias_label}
                  onChange={(event) =>
                    setEditDraft({ ...draft, alias_label: event.target.value })
                  }
                  placeholder="Alias label"
                  className={adminFormStyles.input}
                />
                <input
                  value={draft.priority ?? 0}
                  onChange={(event) =>
                    setEditDraft({ ...draft, priority: Number(event.target.value) })
                  }
                  placeholder="Priority"
                  className={adminFormStyles.input}
                />
                <label className="flex items-center gap-2 text-sm text-brand-text">
                  <input
                    type="checkbox"
                    className="rdk-checkbox"
                    checked={draft.is_active}
                    onChange={(event) =>
                      setEditDraft({ ...draft, is_active: event.target.checked })
                    }
                  />
                  Active
                </label>
              </div>
            );
          })()
        : null}

      <div className="flex items-center justify-end gap-3 border-t border-brand-border pt-4">
        <button
          type="button"
          onClick={() => setEditTarget(null)}
          className={adminButtonStyles.secondary}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSaveEdit}
          disabled={isSaving}
          className={`${adminButtonStyles.primary} disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </TagModalShell>
  );
}

