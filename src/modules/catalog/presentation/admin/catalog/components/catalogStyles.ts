export const catalogStyles = {
  tabBar: "flex flex-wrap gap-2 border-b border-brand-border",
  tabBase:
    "inline-flex items-center border-b-2 px-1 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition-colors",
  tabActive: "border-brand-text text-brand-text",
  tabInactive: "border-transparent text-brand-muted hover:text-brand-text",
  tabCount:
    "inline-flex min-w-[24px] justify-center border border-brand-border bg-brand-page px-2 py-0.5 text-[10px] font-semibold text-brand-text",
  inlinePanel: "border border-brand-border bg-brand-page p-4",
  tableWrap: "overflow-x-auto",
  tableHeadRow: "border-b border-brand-border bg-brand-page",
  tableHeadCell:
    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted",
  tableRow: "border-b border-brand-border transition-colors hover:bg-brand-page/60",
  tableCell: "px-4 py-4 align-top text-sm text-brand-text",
  menuPanel:
    "absolute right-0 z-20 mt-2 min-w-[140px] border border-brand-border bg-brand-surface shadow-lg",
} as const;
