import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import type { EditTarget } from "@/modules/catalog/presentation/admin/catalog/types";
import { TagModalShell } from "@/modules/catalog/presentation/admin/catalog/components/TagModalShell";

type ConfirmDisableTagModalProps = {
  confirmTarget: EditTarget | null;
  isSaving: boolean;
  onConfirmDelete: () => void;
  setConfirmTarget: (value: EditTarget | null) => void;
};

export function ConfirmDisableTagModal({
  confirmTarget,
  isSaving,
  onConfirmDelete,
  setConfirmTarget,
}: ConfirmDisableTagModalProps) {
  if (!confirmTarget) {
    return null;
  }

  return (
    <TagModalShell
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
    </TagModalShell>
  );
}
