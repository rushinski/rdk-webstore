import type { RefundOrderMode } from "@/components/admin/orders/RefundOrderModal";

type RefundModeTabsProps = {
  mode: RefundOrderMode;
  onModeChange: (value: RefundOrderMode) => void;
};

const refundModeLabel: Record<RefundOrderMode, string> = {
  full: "Full refund",
  product: "By product",
  custom: "Custom amount",
};

const getModeButtonStyles = (activeMode: RefundOrderMode, value: RefundOrderMode) =>
  activeMode === value
    ? "border-brand-text bg-brand-text text-brand-page"
    : "border-brand-border bg-brand-page text-brand-muted hover:border-brand-text hover:text-brand-text";

export function RefundModeTabs({ mode, onModeChange }: RefundModeTabsProps) {
  return (
    <div className="flex gap-2">
      {(["full", "product", "custom"] as const).map((entry) => (
        <button
          key={entry}
          type="button"
          onClick={() => onModeChange(entry)}
          className={`border px-3 py-1.5 text-sm transition-colors ${getModeButtonStyles(mode, entry)}`}
        >
          {refundModeLabel[entry]}
        </button>
      ))}
    </div>
  );
}
