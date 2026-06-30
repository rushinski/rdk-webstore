# Admin Catalog Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin catalog page so it uses the shared admin UI system, preserves current behavior, and is split into smaller, clearer components.

**Architecture:** Keep `app/admin/catalog/page.tsx` as the single owner of data loading, filters, tab state, and mutation handlers. Move presentation-heavy tab bodies and shared row/menu UI into focused components under `app/admin/catalog/components`, while restyling `TagModals.tsx` and aligning all controls with the same admin primitives used elsewhere.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind utility classes, existing admin UI primitives, existing catalog APIs

---

## File Structure

**Modify:**
- `app/admin/catalog/page.tsx`
- `app/admin/catalog/components/TagModals.tsx`

**Create:**
- `app/admin/catalog/components/catalogStyles.ts`
- `app/admin/catalog/components/CatalogActionMenu.tsx`
- `app/admin/catalog/components/CatalogToolbar.tsx`
- `app/admin/catalog/components/BrandsTab.tsx`
- `app/admin/catalog/components/AliasesTab.tsx`
- `app/admin/catalog/components/CandidatesTab.tsx`

**Read for patterns/reference:**
- `app/admin/transactions/page.tsx`
- `app/admin/shipping/page.tsx`
- `app/admin/customers/page.tsx`
- `src/components/admin/ui/AdminPageHeader.tsx`
- `src/components/admin/ui/AdminSectionCard.tsx`
- `src/components/admin/ui/AdminEmptyState.tsx`
- `src/components/admin/ui/AdminStatusBadge.tsx`
- `src/components/admin/ui/adminFormStyles.ts`
- `src/components/admin/ui/adminButtonStyles.ts`

**Verification:**
- `npx prettier --write app/admin/catalog/page.tsx app/admin/catalog/components/*.tsx`
- `npx eslint app/admin/catalog/page.tsx app/admin/catalog/components/*.tsx`
- `npm run typecheck`

### Task 1: Establish Shared Catalog Style Tokens And Action Menu

**Files:**
- Create: `app/admin/catalog/components/catalogStyles.ts`
- Create: `app/admin/catalog/components/CatalogActionMenu.tsx`
- Modify: `app/admin/catalog/page.tsx`

- [ ] **Step 1: Create shared class tokens for catalog tabs, tables, and compact row actions**

```ts
export const catalogStyles = {
  tabBar: "flex flex-wrap gap-6 border-b border-brand-border",
  tabBase:
    "border-b-2 py-3 text-sm font-medium transition-colors",
  tabActive: "border-brand-text text-brand-text",
  tabInactive: "border-transparent text-brand-muted hover:text-brand-text",
  tabCount:
    "border border-brand-border bg-brand-page px-2 py-0.5 text-[11px] text-brand-text",
  tableWrap: "overflow-x-auto border border-brand-border bg-brand-surface",
  tableHeadRow: "border-b border-brand-border bg-brand-page",
  tableHeadCell: "p-3 text-left font-semibold text-brand-muted sm:p-4",
  tableRow:
    "border-b border-brand-border transition-colors hover:bg-brand-page",
  tableCell: "p-3 sm:p-4",
  inlinePanel: "border border-brand-border bg-brand-page p-4",
  menuPanel:
    "absolute right-0 z-30 mt-2 w-40 overflow-hidden border border-brand-border bg-brand-surface shadow-xl",
} as const;
```

- [ ] **Step 2: Add a shared action menu component for row-level edit/delete actions**

```tsx
type CatalogActionMenuProps = {
  menuKey: string;
  openMenuKey: string | null;
  onToggle: (key: string) => void;
  onEdit: () => void;
  onDelete: () => void;
};
```

Run behavior:
- Button uses `MoreVertical`
- Menu exposes `Edit` and `Disable`
- Styling uses `brand-*` tokens and `catalogStyles.menuPanel`

- [ ] **Step 3: Wire the new action menu into `page.tsx` without changing existing menu state logic**

```tsx
<CatalogActionMenu
  menuKey={`brand-${brand.id}`}
  openMenuKey={openMenuKey}
  onToggle={toggleMenu}
  onEdit={() => setEditTarget({ type: "brand", item: brand })}
  onDelete={() => setConfirmTarget({ type: "brand", item: brand })}
/>
```

- [ ] **Step 4: Run targeted formatting and type validation for the new files**

Run: `npx prettier --write app/admin/catalog/components/catalogStyles.ts app/admin/catalog/components/CatalogActionMenu.tsx app/admin/catalog/page.tsx`

Expected: formatted files with no syntax changes reported beyond style

- [ ] **Step 5: Commit**

```bash
git add app/admin/catalog/components/catalogStyles.ts app/admin/catalog/components/CatalogActionMenu.tsx app/admin/catalog/page.tsx
git commit -m "refactor: add shared catalog action primitives"
```

### Task 2: Extract And Rebuild The Catalog Toolbar

**Files:**
- Create: `app/admin/catalog/components/CatalogToolbar.tsx`
- Modify: `app/admin/catalog/page.tsx`

- [ ] **Step 1: Move search, filter toggles, and tab controls into a focused toolbar component**

```tsx
type CatalogToolbarProps = {
  activeTab: ActiveTab;
  tabs: Array<{ key: ActiveTab; label: string }>;
  query: string;
  showInactive: boolean;
  showUnverified: boolean;
  counts: {
    brands: number;
    aliases: number;
    candidates: number;
  };
  onTabChange: (tab: ActiveTab) => void;
  onQueryChange: (value: string) => void;
  onShowInactiveChange: (value: boolean) => void;
  onShowUnverifiedChange: (value: boolean) => void;
};
```

- [ ] **Step 2: Restyle the toolbar to match the rebuilt admin pages**

Required structure:
- search input row using `adminFormStyles.input`
- compact checkbox/toggle area for global filters
- tab bar using `catalogStyles.tabBar`, `tabBase`, `tabActive`, `tabInactive`, `tabCount`

- [ ] **Step 3: Replace the old inline toolbar markup in `page.tsx` with `CatalogToolbar`**

```tsx
<CatalogToolbar
  activeTab={activeTab}
  tabs={tabs}
  query={query}
  showInactive={showInactive}
  showUnverified={showUnverified}
  counts={{
    brands: filteredBrands.length,
    aliases: filteredAliases.length,
    candidates: filteredCandidates.length,
  }}
  onTabChange={setActiveTab}
  onQueryChange={setQuery}
  onShowInactiveChange={setShowInactive}
  onShowUnverifiedChange={setShowUnverified}
/>
```

- [ ] **Step 4: Run targeted lint for the updated toolbar and route file**

Run: `npx eslint app/admin/catalog/page.tsx app/admin/catalog/components/CatalogToolbar.tsx`

Expected: no lint errors

- [ ] **Step 5: Commit**

```bash
git add app/admin/catalog/page.tsx app/admin/catalog/components/CatalogToolbar.tsx
git commit -m "refactor: extract catalog toolbar"
```

### Task 3: Extract And Rebuild The Tags Tab

**Files:**
- Create: `app/admin/catalog/components/BrandsTab.tsx`
- Modify: `app/admin/catalog/page.tsx`

- [ ] **Step 1: Move the tags/brands UI into `BrandsTab.tsx`**

```tsx
type BrandsTabProps = {
  isLoading: boolean;
  brands: Brand[];
  filteredModelsByBrandId: Record<string, Model[]>;
  expandedBrands: Record<string, boolean>;
  openMenuKey: string | null;
  onToggleBrandExpansion: (brandId: string) => void;
  onToggleMenu: (key: string) => void;
  onOpenAddBrand: () => void;
  onOpenAddModel: (brand: Brand) => void;
  onEditBrand: (brand: Brand) => void;
  onDeleteBrand: (brand: Brand) => void;
  onEditModel: (model: Model) => void;
  onDeleteModel: (model: Model) => void;
};
```

- [ ] **Step 2: Replace custom dark tables and pills with shared admin patterns**

Required changes:
- section wrapped by `AdminSectionCard`
- loading and empty cases use `AdminEmptyState`
- status/verified states shown via `AdminStatusBadge`
- add-brand call to action uses `adminButtonStyles.primary`
- add-model call to action uses `adminButtonStyles.secondary`
- model expansion row uses `brand-page`/`brand-surface` styling

- [ ] **Step 3: Replace the old `activeTab === "brands"` block in `page.tsx`**

```tsx
{activeTab === "brands" ? (
  <BrandsTab
    isLoading={isLoading}
    brands={filteredBrands}
    filteredModelsByBrandId={filteredModelsByBrandId}
    expandedBrands={expandedBrands}
    openMenuKey={openMenuKey}
    onToggleBrandExpansion={toggleBrandExpansion}
    onToggleMenu={toggleMenu}
    onOpenAddBrand={openAddBrandModal}
    onOpenAddModel={openAddModelModal}
    onEditBrand={(brand) => setEditTarget({ type: "brand", item: brand })}
    onDeleteBrand={(brand) => setConfirmTarget({ type: "brand", item: brand })}
    onEditModel={(model) => setEditTarget({ type: "model", item: model })}
    onDeleteModel={(model) => setConfirmTarget({ type: "model", item: model })}
  />
) : null}
```

- [ ] **Step 4: Verify visual and behavioral parity for expansion and row actions**

Run: `npm run typecheck`

Expected: pass, with tag rows still expandable and row actions still wired

- [ ] **Step 5: Commit**

```bash
git add app/admin/catalog/page.tsx app/admin/catalog/components/BrandsTab.tsx
git commit -m "refactor: extract brands tab"
```

### Task 4: Extract And Rebuild The Aliases Tab

**Files:**
- Create: `app/admin/catalog/components/AliasesTab.tsx`
- Modify: `app/admin/catalog/page.tsx`

- [ ] **Step 1: Move the alias create form and aliases table into `AliasesTab.tsx`**

```tsx
type AliasesTabProps = {
  isLoading: boolean;
  aliases: Alias[];
  brands: Brand[];
  models: Model[];
  newAlias: {
    entityType: "brand" | "model";
    entityId: string;
    label: string;
    priority: string;
  };
  openMenuKey: string | null;
  onToggleMenu: (key: string) => void;
  onNewAliasChange: (
    updater:
      | typeof newAlias
      | ((current: typeof newAlias) => typeof newAlias),
  ) => void;
  onCreateAlias: () => void;
  onEditAlias: (alias: Alias) => void;
  onDeleteAlias: (alias: Alias) => void;
  resolveBrandLabel: (brandId?: string | null) => string;
  resolveModelLabel: (modelId?: string | null) => string;
};
```

- [ ] **Step 2: Restyle the alias create form and table**

Required changes:
- create row sits in `catalogStyles.inlinePanel`
- inputs/selects use `adminFormStyles.input` or `RdkSelect` with brand styling
- add button uses `adminButtonStyles.primary`
- table uses shared head/row/cell classes from `catalogStyles`
- alias status uses `AdminStatusBadge`

- [ ] **Step 3: Replace the old alias block in `page.tsx`**

```tsx
{activeTab === "aliases" ? (
  <AliasesTab
    isLoading={isLoading}
    aliases={filteredAliases}
    brands={brands}
    models={models}
    newAlias={newAlias}
    openMenuKey={openMenuKey}
    onToggleMenu={toggleMenu}
    onNewAliasChange={setNewAlias}
    onCreateAlias={() => {
      void handleCreateAlias();
    }}
    onEditAlias={(alias) => setEditTarget({ type: "alias", item: alias })}
    onDeleteAlias={(alias) => setConfirmTarget({ type: "alias", item: alias })}
    resolveBrandLabel={resolveBrandLabel}
    resolveModelLabel={resolveModelLabel}
  />
) : null}
```

- [ ] **Step 4: Run targeted lint and format checks**

Run: `npx prettier --write app/admin/catalog/page.tsx app/admin/catalog/components/AliasesTab.tsx`

Run: `npx eslint app/admin/catalog/page.tsx app/admin/catalog/components/AliasesTab.tsx`

Expected: both commands complete cleanly

- [ ] **Step 5: Commit**

```bash
git add app/admin/catalog/page.tsx app/admin/catalog/components/AliasesTab.tsx
git commit -m "refactor: extract aliases tab"
```

### Task 5: Extract And Rebuild The Candidates Tab

**Files:**
- Create: `app/admin/catalog/components/CandidatesTab.tsx`
- Modify: `app/admin/catalog/page.tsx`

- [ ] **Step 1: Move the candidate review UI into `CandidatesTab.tsx`**

```tsx
type CandidatesTabProps = {
  isLoading: boolean;
  candidates: Candidate[];
  onAcceptCandidate: (candidate: Candidate) => void;
  onRejectCandidate: (candidate: Candidate) => void;
  resolveBrandLabel: (brandId?: string | null) => string;
};
```

- [ ] **Step 2: Rebuild the candidates review table using the shared admin visual language**

Required changes:
- section wrapped in `AdminSectionCard`
- loading/empty states use `AdminEmptyState`
- entity type shown as `AdminStatusBadge`
- accept uses success-toned action treatment
- reject uses secondary or danger treatment consistent with rebuilt admin pages

- [ ] **Step 3: Replace the old candidate block in `page.tsx`**

```tsx
{activeTab === "candidates" ? (
  <CandidatesTab
    isLoading={isLoading}
    candidates={filteredCandidates}
    onAcceptCandidate={(candidate) => {
      void handleAcceptCandidate(candidate);
    }}
    onRejectCandidate={(candidate) => {
      void handleRejectCandidate(candidate);
    }}
    resolveBrandLabel={resolveBrandLabel}
  />
) : null}
```

- [ ] **Step 4: Run typecheck after all three tab extractions**

Run: `npm run typecheck`

Expected: pass with all tab components wired cleanly

- [ ] **Step 5: Commit**

```bash
git add app/admin/catalog/page.tsx app/admin/catalog/components/CandidatesTab.tsx
git commit -m "refactor: extract candidates tab"
```

### Task 6: Restyle And Simplify Catalog Modals

**Files:**
- Modify: `app/admin/catalog/components/TagModals.tsx`

- [ ] **Step 1: Keep the existing modal behavior but replace legacy styling with the rebuilt admin system**

Required changes:
- overlay remains modal-blocking
- modal surfaces use `brand-surface` and `brand-border`
- headings/body text use `brand-text` and `brand-muted`
- buttons use `adminButtonStyles.primary`, `secondary`, and `danger`
- inputs/selects use `adminFormStyles.input`

- [ ] **Step 2: Preserve create/edit/delete behavior while removing unnecessary visual duplication**

Implementation notes:
- keep add brand modal
- keep add model modal
- keep edit modal
- keep delete confirmation modal
- normalize spacing, labels, and close/cancel actions

- [ ] **Step 3: Run targeted checks**

Run: `npx eslint app/admin/catalog/components/TagModals.tsx`

Expected: no lint issues

- [ ] **Step 4: Run a final catalog-only formatting pass**

Run: `npx prettier --write app/admin/catalog/page.tsx app/admin/catalog/components/*.tsx`

Expected: all catalog files formatted

- [ ] **Step 5: Commit**

```bash
git add app/admin/catalog/components/TagModals.tsx app/admin/catalog/page.tsx app/admin/catalog/components/*.tsx
git commit -m "style: align catalog modals with admin system"
```

### Task 7: Final Verification And Cleanup

**Files:**
- Modify: `app/admin/catalog/page.tsx`
- Modify: `app/admin/catalog/components/*.tsx`

- [ ] **Step 1: Remove dead catalog helpers and imports left behind by the extraction**

Checklist:
- delete any inline menu renderer no longer used
- remove duplicate class constants no longer needed
- remove unused `Fragment` import if no longer required
- ensure no old zinc/dark utility classes remain in catalog files unless intentionally retained

- [ ] **Step 2: Run full catalog verification**

Run: `npx eslint app/admin/catalog/page.tsx app/admin/catalog/components/*.tsx`

Expected: no lint errors

Run: `npm run typecheck`

Expected: 
```text
> typecheck
> tsc --noEmit
```

- [ ] **Step 3: Do a visual consistency sweep by scanning for old styling tokens**

Run: `rg -n "bg-zinc|border-zinc|text-gray|text-white" app/admin/catalog -g "*.tsx"`

Expected: either no results or only intentionally retained cases that match the new system

- [ ] **Step 4: Commit**

```bash
git add app/admin/catalog/page.tsx app/admin/catalog/components/*.tsx
git commit -m "refactor: complete catalog admin redesign"
```
