import { Building, X } from "lucide-react";

import type {
  ExistingAddress,
  HomeOfficeFormData,
} from "@/components/admin/nexus/homeOfficeSetupTypes";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { RdkSelect, type RdkSelectOption } from "@/components/ui/Select";
import { ModalPortal } from "@/components/ui/ModalPortal";

type HomeOfficeAddressFormProps = {
  error: string | null;
  existingAddress: ExistingAddress | null;
  formData: HomeOfficeFormData;
  isConfigured: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onFormDataChange: (value: HomeOfficeFormData) => void;
  onSubmit: (event: React.FormEvent) => void;
  stateOptions: RdkSelectOption[];
  title?: string;
};

export function HomeOfficeAddressForm({
  error,
  existingAddress,
  formData,
  isConfigured,
  isSubmitting,
  onClose,
  onFormDataChange,
  onSubmit,
  stateOptions,
  title,
}: HomeOfficeAddressFormProps) {
  return (
    <ModalPortal open={true} onClose={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-brand-border bg-brand-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-brand-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Building className="h-6 w-6 text-brand-text" />
            <div>
              <h2 className="text-xl font-semibold text-brand-text">
                {title ?? (isConfigured ? "Change Office Location" : "Setup Home Office")}
              </h2>
              <p className="mt-1 text-sm text-brand-muted">
                {isConfigured
                  ? "Update your business address for tax registrations"
                  : "Configure your business address to enable tax registrations"}
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

        <div className="px-6 py-6">
          {existingAddress && (
            <div className="mb-6 border border-brand-border bg-brand-page p-4">
              <div className="mb-2 text-sm font-semibold text-brand-text">
                Current Address
              </div>
              <div className="space-y-1 text-sm text-brand-muted">
                <div>{existingAddress.line1}</div>
                {existingAddress.line2 && <div>{existingAddress.line2}</div>}
                <div>
                  {existingAddress.city}, {existingAddress.state}{" "}
                  {existingAddress.postal_code}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className={adminFormStyles.label}>Business Name (Optional)</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(event) =>
                  onFormDataChange({
                    ...formData,
                    businessName: event.target.value,
                  })
                }
                className={adminFormStyles.input}
                placeholder="Your Business Name"
              />
            </div>

            <div>
              <label className={adminFormStyles.label}>
                Home State <span className="text-red-700">*</span>
              </label>
              <RdkSelect
                value={formData.stateCode}
                onChange={(value) =>
                  onFormDataChange({
                    ...formData,
                    stateCode: value,
                  })
                }
                options={stateOptions}
                placeholder="Select..."
              />
            </div>

            <div>
              <label className={adminFormStyles.label}>
                Address Line 1 <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={formData.line1}
                onChange={(event) =>
                  onFormDataChange({
                    ...formData,
                    line1: event.target.value,
                  })
                }
                className={adminFormStyles.input}
                placeholder="123 Main Street"
                required
              />
            </div>

            <div>
              <label className={adminFormStyles.label}>Address Line 2</label>
              <input
                type="text"
                value={formData.line2}
                onChange={(event) =>
                  onFormDataChange({
                    ...formData,
                    line2: event.target.value,
                  })
                }
                className={adminFormStyles.input}
                placeholder="Suite 100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={adminFormStyles.label}>
                  City <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(event) =>
                    onFormDataChange({
                      ...formData,
                      city: event.target.value,
                    })
                  }
                  className={adminFormStyles.input}
                  placeholder="Charleston"
                  required
                />
              </div>
              <div>
                <label className={adminFormStyles.label}>
                  Postal Code <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(event) =>
                    onFormDataChange({
                      ...formData,
                      postalCode: event.target.value,
                    })
                  }
                  className={adminFormStyles.input}
                  placeholder="29401"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`${adminButtonStyles.primary} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {isSubmitting
                  ? "Saving..."
                  : isConfigured
                    ? "Update Home Office"
                    : "Setup Home Office"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={adminButtonStyles.secondary}
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="mt-6 border border-brand-border bg-brand-page p-4">
            <p className="text-sm text-brand-muted">
              <strong className="text-brand-text">Note:</strong> This address will be used
              as your tax registration headquarters.{" "}
              {!isConfigured && " It will mark your home state for physical nexus."}
            </p>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
