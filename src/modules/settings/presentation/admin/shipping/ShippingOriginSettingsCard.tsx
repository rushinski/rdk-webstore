import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";

type ShippingOriginSettingsCardProps = {
  originLine: string | null;
  onEdit: () => void;
};

const cardStyles = "space-y-3 border border-brand-border bg-brand-surface p-5";
const mutedTextStyles = "text-sm text-brand-muted";

export function ShippingOriginSettingsCard({
  originLine,
  onEdit,
}: ShippingOriginSettingsCardProps) {
  return (
    <AdminSectionCard>
      <div className={cardStyles}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-brand-text">Origin address</h2>
            <p className="text-sm text-brand-muted">Used for labels and rate estimates.</p>
          </div>
          <button type="button" onClick={onEdit} className={adminButtonStyles.secondary}>
            Edit origin
          </button>
        </div>
        <div className={mutedTextStyles}>
          {originLine ? originLine : "No origin address saved yet."}
        </div>
      </div>
    </AdminSectionCard>
  );
}
