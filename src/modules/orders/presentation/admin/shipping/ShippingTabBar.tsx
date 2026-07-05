import type { TabKey } from "@/types/domain/shipping";

type ShippingTabBarProps = {
  activeTab: TabKey;
  counts: Record<TabKey, number>;
  tabs: Array<{ key: TabKey; label: string }>;
  onTabChange: (tab: TabKey) => void;
};

const tabButtonBase =
  "flex items-center gap-1 whitespace-nowrap border-b-2 py-2.5 text-[10px] font-medium transition-colors sm:gap-2 sm:text-sm";

const tabActiveStyles = "border-brand-text text-brand-text";
const tabInactiveStyles = "border-transparent text-brand-muted hover:text-brand-text";
const tabCountStyles =
  "border border-brand-border bg-brand-page px-1 py-0.5 text-[9px] text-brand-text sm:px-2 sm:text-[11px]";

const tabBadge = (count: number) => (count > 99 ? "99+" : String(count));

export function ShippingTabBar({
  activeTab,
  counts,
  tabs,
  onTabChange,
}: ShippingTabBarProps) {
  return (
    <div className="flex flex-nowrap gap-2 border-b border-brand-border sm:gap-6">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`${tabButtonBase} ${activeTab === tab.key ? tabActiveStyles : tabInactiveStyles}`}
        >
          {tab.label}
          <span className={tabCountStyles}>{tabBadge(counts[tab.key] ?? 0)}</span>
        </button>
      ))}
    </div>
  );
}
