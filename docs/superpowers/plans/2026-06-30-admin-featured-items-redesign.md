# Admin Featured Items Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the featured-items admin surface onto the shared admin UI system without changing search, add, remove, or drag-to-reorder behavior.

**Architecture:** Keep `app/admin/featured-items/client.tsx` as the owner of data loading, search, mutations, reorder state, and toast feedback. Extract the search/add area and featured lineup into presentational components under `app/admin/featured-items/components`, then normalize the page shell and styling to the same admin primitives used elsewhere.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind utility classes, existing admin UI primitives, existing featured-items APIs

---

## File Structure

**Modify:**
- `app/admin/featured-items/page.tsx`
- `app/admin/featured-items/client.tsx`

**Create:**
- `app/admin/featured-items/components/FeaturedItemsSearchPanel.tsx`
- `app/admin/featured-items/components/FeaturedItemsList.tsx`
- `app/admin/featured-items/components/featuredItemsStyles.ts`

**Read for patterns/reference:**
- `app/admin/customers/page.tsx`
- `app/admin/catalog/page.tsx`
- `src/components/admin/ui/AdminPageHeader.tsx`
- `src/components/admin/ui/AdminSectionCard.tsx`
- `src/components/admin/ui/AdminEmptyState.tsx`
- `src/components/admin/ui/adminFormStyles.ts`
- `src/components/admin/ui/adminButtonStyles.ts`

**Verification:**
- `npx prettier --write app/admin/featured-items/page.tsx app/admin/featured-items/client.tsx app/admin/featured-items/components/*.tsx`
- `npx eslint app/admin/featured-items/page.tsx app/admin/featured-items/client.tsx app/admin/featured-items/components/*.tsx`
- `npm run typecheck`

### Task 1: Normalize The Page Shell

**Files:**
- Modify: `app/admin/featured-items/page.tsx`
- Modify: `app/admin/featured-items/client.tsx`

- [ ] **Step 1: Simplify the route wrapper so the client owns the full admin page shell**

```tsx
import { FeaturedItemsManager } from "./client";

export default function FeaturedItemsPage() {
  return <FeaturedItemsManager />;
}
```

- [ ] **Step 2: Replace the legacy top-level page spacing in `client.tsx` with the shared admin page structure**

Required layout:
- `AdminPageHeader`
- top-level `space-y-6`
- `AdminSectionCard` for search/add
- `AdminSectionCard` for lineup

- [ ] **Step 3: Keep toast rendering unchanged while moving it to the normalized page shell**

```tsx
<Toast
  open={Boolean(toast)}
  message={toast?.message ?? ""}
  tone={toast?.tone ?? "info"}
  onClose={() => setToast(null)}
/>
```

- [ ] **Step 4: Run formatting on the two route files**

Run: `npx prettier --write app/admin/featured-items/page.tsx app/admin/featured-items/client.tsx`

Expected: files are formatted with no syntax issues

- [ ] **Step 5: Commit**

```bash
git add app/admin/featured-items/page.tsx app/admin/featured-items/client.tsx
git commit -m "style: normalize featured items page shell"
```

### Task 2: Add Shared Featured-Items Style Tokens

**Files:**
- Create: `app/admin/featured-items/components/featuredItemsStyles.ts`
- Modify: `app/admin/featured-items/client.tsx`

- [ ] **Step 1: Add shared class tokens for search results, list rows, placeholders, and drag state**

```ts
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
```

- [ ] **Step 2: Replace repeated ad hoc classes in `client.tsx` with the new shared tokens where possible**

Goal:
- reduce repeated visual strings
- keep behavior unchanged
- prepare clean props for extracted components

- [ ] **Step 3: Run targeted lint for the style token file and client file**

Run: `npx eslint app/admin/featured-items/client.tsx app/admin/featured-items/components/featuredItemsStyles.ts`

Expected: no lint errors

- [ ] **Step 4: Commit**

```bash
git add app/admin/featured-items/client.tsx app/admin/featured-items/components/featuredItemsStyles.ts
git commit -m "refactor: add featured items style tokens"
```

### Task 3: Extract The Search/Add Panel

**Files:**
- Create: `app/admin/featured-items/components/FeaturedItemsSearchPanel.tsx`
- Modify: `app/admin/featured-items/client.tsx`

- [ ] **Step 1: Move the search input and results UI into a focused presentational component**

```tsx
type FeaturedItemsSearchPanelProps = {
  searchQuery: string;
  isSearching: boolean;
  searchResults: Product[];
  onSearchQueryChange: (value: string) => void;
  onAddFeaturedItem: (productId: string) => void;
  formatPrice: (cents: number) => string;
  getMinPrice: (variants?: Array<{ sale_price_cents: number }>) => number;
};
```

- [ ] **Step 2: Restyle the search/add section to the shared admin system**

Required changes:
- section content sits inside `AdminSectionCard`
- search input uses `adminFormStyles.input`
- add button affordance stays clear without changing click behavior
- empty/no-result copy uses `brand-*` palette
- image placeholders use the shared featured-items tokens

- [ ] **Step 3: Replace the inline search/add markup in `client.tsx` with the new component**

```tsx
<FeaturedItemsSearchPanel
  searchQuery={searchQuery}
  isSearching={isSearching}
  searchResults={filteredSearchResults}
  onSearchQueryChange={setSearchQuery}
  onAddFeaturedItem={(productId) => {
    void addFeaturedItem(productId);
  }}
  formatPrice={formatPrice}
  getMinPrice={getMinPrice}
/>
```

- [ ] **Step 4: Run formatting and lint checks for the extracted search panel**

Run: `npx prettier --write app/admin/featured-items/client.tsx app/admin/featured-items/components/FeaturedItemsSearchPanel.tsx`

Run: `npx eslint app/admin/featured-items/client.tsx app/admin/featured-items/components/FeaturedItemsSearchPanel.tsx`

Expected: both commands complete cleanly

- [ ] **Step 5: Commit**

```bash
git add app/admin/featured-items/client.tsx app/admin/featured-items/components/FeaturedItemsSearchPanel.tsx
git commit -m "refactor: extract featured items search panel"
```

### Task 4: Extract The Featured Lineup List

**Files:**
- Create: `app/admin/featured-items/components/FeaturedItemsList.tsx`
- Modify: `app/admin/featured-items/client.tsx`

- [ ] **Step 1: Move the featured lineup UI into a focused presentational component**

```tsx
type FeaturedItemsListProps = {
  featuredItems: FeaturedItem[];
  draggedIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onRemoveFeaturedItem: (productId: string) => void;
  formatPrice: (cents: number) => string;
  getMinPrice: (variants?: Array<{ sale_price_cents: number }>) => number;
};
```

- [ ] **Step 2: Rebuild the lineup styling while preserving drag behavior exactly**

Required changes:
- header and count match the admin system
- empty state uses `AdminEmptyState`
- drag handle, row shell, number badge, and remove action use `brand-*` palette
- out-of-stock warning remains visible
- public storefront link remains visible

- [ ] **Step 3: Replace the inline lineup markup in `client.tsx` with the extracted component**

```tsx
<FeaturedItemsList
  featuredItems={featuredItems}
  draggedIndex={draggedIndex}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={() => {
    void handleDragEnd();
  }}
  onRemoveFeaturedItem={(productId) => {
    void removeFeaturedItem(productId);
  }}
  formatPrice={formatPrice}
  getMinPrice={getMinPrice}
/>
```

- [ ] **Step 4: Run typecheck after the list extraction**

Run: `npm run typecheck`

Expected:
```text
> typecheck
> tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/featured-items/client.tsx app/admin/featured-items/components/FeaturedItemsList.tsx
git commit -m "refactor: extract featured items list"
```

### Task 5: Final Cleanup And Verification

**Files:**
- Modify: `app/admin/featured-items/client.tsx`
- Modify: `app/admin/featured-items/components/*.tsx`

- [ ] **Step 1: Remove dead helpers, imports, and leftover legacy styling from featured-items**

Checklist:
- remove any now-unused icon imports from `client.tsx`
- remove legacy wrapper spacing no longer needed
- ensure repeated visual classes are consolidated where practical
- ensure no unnecessary `bg-zinc`, `border-zinc`, `text-gray`, or `text-white` remain

- [ ] **Step 2: Run full featured-items verification**

Run: `npx eslint app/admin/featured-items/page.tsx app/admin/featured-items/client.tsx app/admin/featured-items/components/*.tsx`

Expected: no lint errors

Run: `npm run typecheck`

Expected:
```text
> typecheck
> tsc --noEmit
```

- [ ] **Step 3: Scan for old styling tokens**

Run: `rg -n "bg-zinc|border-zinc|text-gray|text-white" app/admin/featured-items -g "*.tsx"`

Expected: either no results or only intentionally retained cases justified by the new design

- [ ] **Step 4: Commit**

```bash
git add app/admin/featured-items/page.tsx app/admin/featured-items/client.tsx app/admin/featured-items/components/*.tsx
git commit -m "refactor: complete featured items admin redesign"
```
