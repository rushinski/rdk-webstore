import type { Dispatch, SetStateAction } from "react";

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
      {showAddBrandModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
          onClick={() => setShowAddBrandModal(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800/70 rounded-lg w-full max-w-lg p-6 space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add brand</h3>
              <button
                onClick={() => setShowAddBrandModal(false)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={newBrand.label}
                onChange={(e) =>
                  setNewBrand((prev) => ({ ...prev, label: e.target.value }))
                }
                onBlur={(e) =>
                  setNewBrand((prev) => ({ ...prev, label: toTitleCase(e.target.value) }))
                }
                placeholder="Brand label (e.g., Air Jordan)"
                className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddBrandModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white rounded px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={onCreateBrand}
                className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2"
              >
                Add Brand
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModelModal && modelTargetBrand && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
          onClick={() => {
            setShowAddModelModal(false);
            setModelTargetBrand(null);
          }}
        >
          <div
            className="bg-zinc-900 border border-zinc-800/70 rounded-lg w-full max-w-lg p-6 space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Add Model</h3>
                <p className="text-xs text-gray-500">
                  Brand: {modelTargetBrand.canonical_label}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModelModal(false);
                  setModelTargetBrand(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={newModel.label}
                onChange={(e) =>
                  setNewModel((prev) => ({ ...prev, label: e.target.value }))
                }
                onBlur={(e) =>
                  setNewModel((prev) => ({ ...prev, label: toTitleCase(e.target.value) }))
                }
                placeholder="Model label (e.g., Retro 3)"
                className="w-full bg-zinc-900 border border-zinc-800/70 text-white px-3 py-2"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModelModal(false);
                  setModelTargetBrand(null);
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-white rounded px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={onCreateModel}
                className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2"
              >
                Add Model
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && editDraft && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div
            className="bg-zinc-900 border border-zinc-800/70 rounded-lg w-full max-w-lg p-6 space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Edit {editTarget.type}</h3>
              <button
                onClick={() => setEditTarget(null)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {editTarget.type === "brand" && (
              <div className="space-y-3">
                {(() => {
                  const draft = editDraft as BrandEditDraft;
                  return (
                    <>
                      <input
                        value={draft.canonical_label}
                        onChange={(e) =>
                          setEditDraft({ ...draft, canonical_label: e.target.value })
                        }
                        placeholder="Brand label"
                        className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                      />
                      <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="rdk-checkbox"
                            checked={draft.is_active}
                            onChange={(e) =>
                              setEditDraft({ ...draft, is_active: e.target.checked })
                            }
                          />
                          Active
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="rdk-checkbox"
                            checked={draft.is_verified}
                            onChange={(e) =>
                              setEditDraft({ ...draft, is_verified: e.target.checked })
                            }
                          />
                          Verified
                        </label>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {editTarget.type === "model" && (
              <div className="space-y-3">
                {(() => {
                  const draft = editDraft as ModelEditDraft;
                  return (
                    <>
                      <select
                        value={draft.brand_id}
                        onChange={(e) =>
                          setEditDraft({ ...draft, brand_id: e.target.value })
                        }
                        className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                      >
                        {brands.map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.canonical_label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={draft.canonical_label}
                        onChange={(e) =>
                          setEditDraft({ ...draft, canonical_label: e.target.value })
                        }
                        placeholder="Model label"
                        className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                      />
                      <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="rdk-checkbox"
                            checked={draft.is_active}
                            onChange={(e) =>
                              setEditDraft({ ...draft, is_active: e.target.checked })
                            }
                          />
                          Active
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="rdk-checkbox"
                            checked={draft.is_verified}
                            onChange={(e) =>
                              setEditDraft({ ...draft, is_verified: e.target.checked })
                            }
                          />
                          Verified
                        </label>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {editTarget.type === "alias" && (
              <div className="space-y-3">
                {(() => {
                  const draft = editDraft as AliasEditDraft;
                  return (
                    <>
                      <input
                        value={draft.alias_label}
                        onChange={(e) =>
                          setEditDraft({ ...draft, alias_label: e.target.value })
                        }
                        placeholder="Alias"
                        className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                      />
                      <input
                        value={draft.priority ?? 0}
                        onChange={(e) =>
                          setEditDraft({ ...draft, priority: Number(e.target.value) })
                        }
                        placeholder="Priority"
                        className="w-full bg-zinc-800 text-white px-3 py-2 rounded"
                      />
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          className="rdk-checkbox"
                          checked={draft.is_active}
                          onChange={(e) =>
                            setEditDraft({ ...draft, is_active: e.target.checked })
                          }
                        />
                        Active
                      </label>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setEditTarget(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white rounded px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={onSaveEdit}
                disabled={isSaving}
                className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2 disabled:bg-gray-600"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div
            className="bg-zinc-900 border border-zinc-800/70 rounded-lg w-full max-w-md p-6 space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">
              Delete {confirmTarget.type}
            </h3>
            <p className="text-sm text-gray-400">
              This will disable the item (soft delete). You can re-enable it later by
              editing the record.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white rounded px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmDelete}
                disabled={isSaving}
                className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2 disabled:bg-gray-600"
              >
                {isSaving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
