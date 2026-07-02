import type { InventoryLiveState } from "@/components/admin/inventory/inventoryProductListView";

type InventoryProductLiveBadgeProps = {
  liveState: InventoryLiveState;
};

export function InventoryProductLiveBadge({ liveState }: InventoryProductLiveBadgeProps) {
  return (
    <div className="flex w-full flex-col items-start gap-1 text-left">
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
          liveState.isLive
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border border-amber-200 bg-amber-50 text-amber-700"
        }`}
      >
        {liveState.label}
      </span>
      {liveState.detail && (
        <span
          className="whitespace-nowrap text-left text-[11px] leading-none text-brand-muted"
          title={liveState.detailTooltip ?? undefined}
        >
          {liveState.detail}
        </span>
      )}
    </div>
  );
}
