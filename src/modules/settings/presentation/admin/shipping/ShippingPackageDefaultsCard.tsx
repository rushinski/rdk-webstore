import type { ShippingDefaultValues } from "@/modules/settings/presentation/admin/shipping/shippingSettingsConfig";
import { SHIPPING_CATEGORIES } from "@/modules/settings/presentation/admin/shipping/shippingSettingsConfig";
import { buildShippingPackageSummary } from "@/modules/settings/presentation/admin/shipping/shippingSettingsView";
import { adminButtonStyles } from "@/modules/shared/presentation/admin/ui/adminButtonStyles";
import { AdminSectionCard } from "@/modules/shared/presentation/admin/ui/AdminSectionCard";

type ShippingPackageDefaultsCardProps = {
  message: string | null;
  shippingDefaults: Record<string, ShippingDefaultValues>;
  onOpenDefaultsModal: (categoryKey: string) => void;
};

const cardStyles = "space-y-3 border border-brand-border bg-brand-surface p-5";

export function ShippingPackageDefaultsCard({
  message,
  shippingDefaults,
  onOpenDefaultsModal,
}: ShippingPackageDefaultsCardProps) {
  return (
    <AdminSectionCard>
      <div className={cardStyles}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-brand-text">Default packages</h2>
            <p className="text-sm text-brand-muted">
              Configure default cost, weight, and dimensions per category.
            </p>
          </div>
          {message && <span className="text-sm text-brand-muted">{message}</span>}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {SHIPPING_CATEGORIES.map((category) => {
            const summary = buildShippingPackageSummary(shippingDefaults, category.key);
            return (
              <div key={category.key} className="border border-brand-border bg-brand-page p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-brand-muted">
                      {category.label}
                    </div>
                    <div className="mt-1 text-base font-semibold text-brand-text">
                      ${summary.cost} shipping
                    </div>
                    <div className="mt-2 text-xs text-brand-muted">
                      {summary.length} x {summary.width} x {summary.height} in · {summary.weight} oz
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenDefaultsModal(category.key)}
                    className={adminButtonStyles.secondary}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminSectionCard>
  );
}

