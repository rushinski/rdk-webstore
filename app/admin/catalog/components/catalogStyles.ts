export const catalogStyles = {
  tabBar: "flex flex-wrap gap-6 border-b border-brand-border",
  tabBase: "border-b-2 py-3 text-sm font-medium transition-colors",
  tabActive: "border-brand-text text-brand-text",
  tabInactive: "border-transparent text-brand-muted hover:text-brand-text",
  tabCount:
    "border border-brand-border bg-brand-page px-2 py-0.5 text-[11px] text-brand-text",
  tableWrap: "overflow-x-auto border border-brand-border bg-brand-surface",
  tableHeadRow: "border-b border-brand-border bg-brand-page",
  tableHeadCell: "p-3 text-left font-semibold text-brand-muted sm:p-4",
  tableRow: "border-b border-brand-border transition-colors hover:bg-brand-page",
  tableCell: "p-3 sm:p-4",
  inlinePanel: "border border-brand-border bg-brand-page p-4",
  menuPanel:
    "absolute right-0 z-30 mt-2 w-40 overflow-hidden border border-brand-border bg-brand-surface shadow-xl",
} as const;
