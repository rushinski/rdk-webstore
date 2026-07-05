import { AVAILABLE_CARRIERS } from "@/modules/settings/presentation/admin/shipping/shippingSettingsConfig";
import { adminButtonStyles } from "@/modules/shared/presentation/admin/ui/adminButtonStyles";
import { AdminSectionCard } from "@/modules/shared/presentation/admin/ui/AdminSectionCard";

type ShippingCarriersSettingsCardProps = {
  carriersMessage: string | null;
  enabledCarriers: string[];
  isSavingCarriers: boolean;
  onSaveCarriers: () => void;
  onToggleCarrier: (carrierKey: string) => void;
};

const cardStyles = "space-y-3 border border-brand-border bg-brand-surface p-5";

export function ShippingCarriersSettingsCard({
  carriersMessage,
  enabledCarriers,
  isSavingCarriers,
  onSaveCarriers,
  onToggleCarrier,
}: ShippingCarriersSettingsCardProps) {
  return (
    <AdminSectionCard>
      <div className={cardStyles}>
        <div>
          <h2 className="mb-2 text-base font-semibold text-brand-text">Enabled Carriers</h2>
          <p className="mb-4 text-sm text-brand-muted">
            Select which carriers to offer for label creation.
          </p>
        </div>
        <div className="space-y-2">
          {AVAILABLE_CARRIERS.map((carrier) => (
            <label
              key={carrier.key}
              className="flex cursor-pointer items-start gap-3 border border-brand-border bg-brand-page p-3 hover:border-brand-text"
            >
              <input
                type="checkbox"
                checked={enabledCarriers.includes(carrier.key)}
                onChange={() => onToggleCarrier(carrier.key)}
                className="mt-1 rdk-checkbox"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-brand-text">{carrier.label}</div>
                <div className="text-xs text-brand-muted">{carrier.description}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onSaveCarriers}
            disabled={isSavingCarriers}
            className={`${adminButtonStyles.primary} w-full disabled:cursor-not-allowed disabled:border-brand-border disabled:bg-brand-page disabled:text-brand-muted`}
          >
            {isSavingCarriers ? "Saving..." : "Save carriers"}
          </button>
          {carriersMessage && <div className="mt-2 text-sm text-brand-muted">{carriersMessage}</div>}
        </div>
      </div>
    </AdminSectionCard>
  );
}

