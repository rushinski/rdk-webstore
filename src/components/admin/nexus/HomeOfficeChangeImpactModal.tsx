import { AlertTriangle, X } from "lucide-react";

import type {
  HomeOfficeFormData,
  OldHomeOfficeAction,
} from "@/components/admin/nexus/homeOfficeSetupTypes";
import {
  getHomeOfficeActionButtonClassName,
  getHomeOfficeChangeImpactIntro,
  getHomeOfficeChangeImpactSubtitle,
  updateOldHomeOfficeAction,
} from "@/components/admin/nexus/homeOfficeChangeImpactView";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { STATE_NAMES } from "@/config/constants/nexus-thresholds";

type HomeOfficeChangeImpactModalProps = {
  error: string | null;
  formData: HomeOfficeFormData;
  isSubmitting: boolean;
  oldHomeAction: OldHomeOfficeAction;
  oldHomeState: string;
  onClose: () => void;
  onConfirm: () => void;
  onOldHomeActionChange: (value: OldHomeOfficeAction) => void;
};

export function HomeOfficeChangeImpactModal({
  error,
  formData,
  isSubmitting,
  oldHomeAction,
  oldHomeState,
  onClose,
  onConfirm,
  onOldHomeActionChange,
}: HomeOfficeChangeImpactModalProps) {
  return (
    <ModalPortal open={true} onClose={onClose}>
      <div
        className="w-full max-w-xl border border-brand-border bg-brand-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-brand-border px-6 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-700" />
            <div>
              <h2 className="text-xl font-semibold text-brand-text">
                Update Previous Home Office
              </h2>
              <p className="mt-1 text-sm text-brand-muted">
                {getHomeOfficeChangeImpactSubtitle(oldHomeState)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="border border-brand-border p-2 hover:bg-brand-page"
          >
            <X className="h-4 w-4 text-brand-muted" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-sm text-amber-800">
              {getHomeOfficeChangeImpactIntro(oldHomeState, formData)}
            </p>
            <p className="mt-2 text-xs text-amber-700">
              <strong>Important:</strong> Most states require you to continue collecting
              sales tax through the end of the current tax year even after moving your
              office location. Consult with a tax professional before disabling
              collection.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`${adminFormStyles.label} mb-3`}>
                Do you still have physical nexus in {STATE_NAMES[oldHomeState]}?
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onOldHomeActionChange(
                      updateOldHomeOfficeAction(
                        oldHomeAction,
                        "hasPhysicalNexus",
                        true,
                      ),
                    )
                  }
                  className={getHomeOfficeActionButtonClassName(
                    oldHomeAction.hasPhysicalNexus,
                  )}
                >
                  Yes, I have physical presence
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOldHomeActionChange(
                      updateOldHomeOfficeAction(
                        oldHomeAction,
                        "hasPhysicalNexus",
                        false,
                      ),
                    )
                  }
                  className={getHomeOfficeActionButtonClassName(
                    !oldHomeAction.hasPhysicalNexus,
                  )}
                >
                  No, only economic nexus
                </button>
              </div>
            </div>

            <div>
              <label className={`${adminFormStyles.label} mb-3`}>
                Should we continue collecting tax in {STATE_NAMES[oldHomeState]}?
              </label>
              <p className="mb-3 text-xs text-brand-muted">
                Most states require you to continue collecting through the end of the
                current tax year. Only select "No" if you've confirmed with your state's
                tax authority or a tax professional.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onOldHomeActionChange(
                      updateOldHomeOfficeAction(
                        oldHomeAction,
                        "continueCollecting",
                        true,
                      ),
                    )
                  }
                  className={getHomeOfficeActionButtonClassName(
                    oldHomeAction.continueCollecting,
                  )}
                >
                  Yes, keep collecting tax (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOldHomeActionChange(
                      updateOldHomeOfficeAction(
                        oldHomeAction,
                        "continueCollecting",
                        false,
                      ),
                    )
                  }
                  className={getHomeOfficeActionButtonClassName(
                    !oldHomeAction.continueCollecting,
                  )}
                >
                  No, stop collecting tax
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`${adminButtonStyles.primary} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isSubmitting ? "Updating..." : "Confirm Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={adminButtonStyles.secondary}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
