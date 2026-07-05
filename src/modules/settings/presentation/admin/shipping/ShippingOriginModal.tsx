import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  ShippingSettingsField,
  ShippingSettingsModalShell,
} from "@/modules/settings/presentation/admin/shipping/ShippingSettingsShared";

type ShippingOriginAddress = {
  name: string;
  company: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type OriginErrors = Partial<Record<keyof ShippingOriginAddress, string>>;

type ShippingOriginModalProps = {
  open: boolean;
  originDraft: ShippingOriginAddress;
  originErrors: OriginErrors;
  originError: string;
  originMessage: string;
  isSavingOrigin: boolean;
  onClose: () => void;
  onChange: (field: keyof ShippingOriginAddress, value: string) => void;
  onSave: () => void;
};

export function ShippingOriginModal({
  open,
  originDraft,
  originErrors,
  originError,
  originMessage,
  isSavingOrigin,
  onClose,
  onChange,
  onSave,
}: ShippingOriginModalProps) {
  if (!open) {
    return null;
  }

  return (
    <ModalPortal open={open} onClose={onClose}>
      <ShippingSettingsModalShell
        title="Edit Origin"
        description="Shipping origin address"
        maxWidthClassName="max-w-3xl"
        onClose={onClose}
      >
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4">
          <div className="sm:col-span-2">
            <p className="text-xs text-brand-muted">
              Provide a contact name or company name. Phone number is optional.
            </p>
          </div>
          <ShippingSettingsField label="Contact name" error={originErrors.name}>
            <input
              type="text"
              value={originDraft.name}
              onChange={(e) => onChange("name", e.target.value)}
              className={adminFormStyles.input}
            />
          </ShippingSettingsField>
          <ShippingSettingsField label="Company" error={originErrors.company}>
            <input
              type="text"
              value={originDraft.company ?? ""}
              onChange={(e) => onChange("company", e.target.value)}
              className={adminFormStyles.input}
            />
          </ShippingSettingsField>
          <ShippingSettingsField
            label="Phone number (optional)"
            error={originErrors.phone}
          >
            <input
              type="text"
              value={originDraft.phone ?? ""}
              onChange={(e) => onChange("phone", e.target.value)}
              className={adminFormStyles.input}
            />
          </ShippingSettingsField>
          <ShippingSettingsField label="Street address" error={originErrors.line1}>
            <input
              type="text"
              value={originDraft.line1}
              onChange={(e) => onChange("line1", e.target.value)}
              className={adminFormStyles.input}
            />
          </ShippingSettingsField>
          <ShippingSettingsField
            label="Apartment, suite, etc."
            error={originErrors.line2}
          >
            <input
              type="text"
              value={originDraft.line2 ?? ""}
              onChange={(e) => onChange("line2", e.target.value)}
              className={adminFormStyles.input}
            />
          </ShippingSettingsField>
          <ShippingSettingsField label="City" error={originErrors.city}>
            <input
              type="text"
              value={originDraft.city}
              onChange={(e) => onChange("city", e.target.value)}
              className={adminFormStyles.input}
            />
          </ShippingSettingsField>
          <ShippingSettingsField label="State" error={originErrors.state}>
            <input
              type="text"
              value={originDraft.state}
              onChange={(e) => onChange("state", e.target.value)}
              className={adminFormStyles.input}
            />
          </ShippingSettingsField>
          <ShippingSettingsField
            label="ZIP / Postal code"
            error={originErrors.postal_code}
          >
            <input
              type="text"
              value={originDraft.postal_code}
              onChange={(e) => onChange("postal_code", e.target.value)}
              className={adminFormStyles.input}
            />
          </ShippingSettingsField>
          <ShippingSettingsField label="Country" error={originErrors.country}>
            <input
              type="text"
              value={originDraft.country}
              onChange={(e) => onChange("country", e.target.value)}
              className={adminFormStyles.input}
            />
          </ShippingSettingsField>
        </div>

        {(originError || originMessage) && (
          <div className={`text-sm ${originError ? "text-red-700" : "text-brand-muted"}`}>
            {originError || originMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-brand-border pt-4">
          <button type="button" onClick={onClose} className={adminButtonStyles.secondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSavingOrigin}
            className={`${adminButtonStyles.primary} disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
          >
            {isSavingOrigin ? "Saving..." : "Save origin"}
          </button>
        </div>
      </ShippingSettingsModalShell>
    </ModalPortal>
  );
}
