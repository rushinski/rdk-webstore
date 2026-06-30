"use client";

import type { Dispatch, SetStateAction } from "react";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { RdkSelect } from "@/components/ui/Select";

import type {
  AliasEditDraft,
  Brand,
  BrandEditDraft,
  EditDraft,
  EditTarget,
  ModelEditDraft,
} from "../types";

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

function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-brand-border bg-brand-surface p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-border pb-4">
          <div>
            <h3 className="text-lg font-semibold uppercase tracking-[0.08em] text-brand-text">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm text-brand-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-brand-muted transition hover:text-brand-text"
          >
            Close
          </button>
        </div>
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

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
      {showAddBrandModal ? (
        <ModalShell
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
        </ModalShell>
      ) : null}

      {showAddModelModal && modelTargetBrand ? (
        <ModalShell
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
        </ModalShell>
      ) : null}

      {editTarget && editDraft ? (
        <ModalShell
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
        </ModalShell>
      ) : null}

      {confirmTarget ? (
        <ModalShell
          title={`Disable ${confirmTarget.type}`}
          description="This is a soft delete. The item will be disabled and can be re-enabled later."
          onClose={() => setConfirmTarget(null)}
        >
          <p className="text-sm text-brand-text">
            This will remove the item from active parser and UI use without permanently
            deleting the record.
          </p>
          <div className="flex items-center justify-end gap-3 border-t border-brand-border pt-4">
            <button
              type="button"
              onClick={() => setConfirmTarget(null)}
              className={adminButtonStyles.secondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={isSaving}
              className={`${adminButtonStyles.danger} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isSaving ? "Disabling..." : "Disable"}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
