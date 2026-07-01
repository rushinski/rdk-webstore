export const featuredItemsStyles = {
  searchPanel: "relative",
  searchResults:
    "absolute z-20 mt-2 max-h-96 w-full overflow-y-auto border border-brand-border bg-brand-surface shadow-xl",
  searchResultItem:
    "grid w-full grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-brand-border p-4 text-left transition hover:bg-brand-page",
  imageFrame:
    "relative h-16 w-16 overflow-hidden border border-brand-border bg-brand-page",
  imageFallback:
    "flex h-16 w-16 items-center justify-center border border-brand-border bg-brand-page text-xs text-brand-muted",
  listRow:
    "flex items-center gap-4 border border-brand-border bg-brand-surface p-4 transition hover:bg-brand-page",
  draggedRow: "opacity-50",
  positionBadge:
    "flex h-8 w-8 items-center justify-center border border-brand-border bg-brand-page text-sm font-semibold text-brand-text",
} as const;
