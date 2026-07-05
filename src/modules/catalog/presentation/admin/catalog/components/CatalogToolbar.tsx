"use client";

import { Search } from "lucide-react";

import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import type { ActiveTab } from "@/modules/catalog/presentation/admin/catalog/types";

import { catalogStyles } from "@/modules/catalog/presentation/admin/catalog/components/catalogStyles";

type CatalogToolbarProps = {
  activeTab: ActiveTab;
  tabs: Array<{ key: ActiveTab; label: string }>;
  query: string;
  showInactive: boolean;
  showUnverified: boolean;
  counts: Record<ActiveTab, number>;
  onTabChange: (tab: ActiveTab) => void;
  onQueryChange: (value: string) => void;
  onShowInactiveChange: (value: boolean) => void;
  onShowUnverifiedChange: (value: boolean) => void;
};

export function CatalogToolbar({
  activeTab,
  tabs,
  query,
  showInactive,
  showUnverified,
  counts,
  onTabChange,
  onQueryChange,
  onShowInactiveChange,
  onShowUnverifiedChange,
}: CatalogToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full items-center gap-2 border border-brand-border bg-brand-surface px-3 py-2 lg:max-w-md">
          <Search className="h-4 w-4 text-brand-muted" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search tags, aliases, or candidates"
            className={`${adminFormStyles.input} border-0 bg-transparent px-0 py-0 placeholder:text-brand-muted focus:border-0`}
          />
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-brand-text">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="rdk-checkbox"
              checked={showInactive}
              onChange={(event) => onShowInactiveChange(event.target.checked)}
            />
            Show inactive
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="rdk-checkbox"
              checked={showUnverified}
              onChange={(event) => onShowUnverifiedChange(event.target.checked)}
            />
            Show unverified
          </label>
        </div>
      </div>

      <div className={catalogStyles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`${catalogStyles.tabBase} ${
                isActive ? catalogStyles.tabActive : catalogStyles.tabInactive
              }`}
            >
              <span>{tab.label}</span>
              <span className={`ml-2 ${catalogStyles.tabCount}`}>{counts[tab.key]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
