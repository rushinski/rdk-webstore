"use client";

import {
  TRANSACTION_TABS,
  type TabKey,
} from "@/components/admin/transactions/useAdminTransactionsData";

type TransactionsTabBarProps = {
  activeTab: TabKey;
  counts: Record<TabKey, number>;
  onTabChange: (tab: TabKey) => void;
};

const tabButtonBase =
  "flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors";
const tabActiveStyles = "border-brand-text text-brand-text";
const tabInactiveStyles = "border-transparent text-brand-muted hover:text-brand-text";
const tabCountStyles =
  "border border-brand-border bg-brand-page px-2 py-0.5 text-[11px] text-brand-text";

export function TransactionsTabBar({
  activeTab,
  counts,
  onTabChange,
}: TransactionsTabBarProps) {
  return (
    <div className="flex flex-wrap gap-6 border-b border-brand-border">
      {TRANSACTION_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`${tabButtonBase} ${activeTab === tab.key ? tabActiveStyles : tabInactiveStyles}`}
        >
          {tab.label}
          <span className={tabCountStyles}>
            {counts[tab.key] > 99 ? "99+" : counts[tab.key]}
          </span>
        </button>
      ))}
    </div>
  );
}
