"use client";

import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";

type ShippingOriginBarProps = {
  originLine: string | null;
  onChangeOrigin: () => void;
};

export function ShippingOriginBar({
  originLine,
  onChangeOrigin,
}: ShippingOriginBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="text-brand-text">
        <span className="text-brand-muted">Origin:</span> {originLine || "Not set"}
      </div>
      <button
        type="button"
        onClick={onChangeOrigin}
        className={adminButtonStyles.secondary}
      >
        Change origin address
      </button>
    </div>
  );
}
