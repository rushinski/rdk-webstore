# Website Product Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a website-only archived product state with read-only restore flow, dedicated admin tab, and bulk archive support including cross-page “select all matching products”.

**Architecture:** Introduce a dedicated `products.archived_at` column and thread it through repository filters, admin APIs, and inventory UI without coupling it to Lightspeed. Treat archive as a local catalog state: storefront excludes archived products, admin can view/restore them, and website-to-Lightspeed sync paths skip them entirely.

**Tech Stack:** Next.js App Router, Supabase/Postgres, TypeScript, Jest, existing admin inventory client, existing product repository/service layers.

---

## File Structure

**Create**

- `supabase/migrations/20260607210000_product_archive_state.sql`
- `tests/unit/product-archive-repo.test.ts`
- `tests/unit/product-archive-service.test.ts`
- `tests/unit/product-archive-api.test.ts`
- `tests/unit/admin-inventory-archive-selection.test.tsx`

**Modify**

- `src/types/db/database.types.ts`
- `src/types/domain/product.ts`
- `src/repositories/product-repo.ts`
- `src/services/product-service.ts`
- `src/services/lightspeed-product-sync-service.ts`
- `src/services/lightspeed-inventory-propagation-service.ts`
- `src/lib/validation/product.ts`
- `app/api/admin/products/route.ts`
- `app/api/admin/products/[id]/route.ts`
- `app/admin/inventory/client.tsx`
- `app/admin/inventory/page.tsx`
- `app/admin/inventory/[id]/edit/actions.ts`
- `app/admin/inventory/[id]/edit/client.tsx`
- `src/services/storefront-service.ts`
- any storefront/product query code that still relies only on `is_active`

---

### Task 1: Add Archived Product Schema

**Files:**
- Create: `supabase/migrations/20260607210000_product_archive_state.sql`
- Modify: `src/types/db/database.types.ts`
- Test: `tests/unit/product-archive-repo.test.ts`

- [ ] **Step 1: Write the failing repository test expectations**

Add tests covering:
- archived products are excluded from normal inventory/storefront lists
- archived products are returned only when explicitly requested
- archive/restore repository methods set and clear `archived_at`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/product-archive-repo.test.ts`
Expected: FAIL because archive filtering/methods do not exist yet.

- [ ] **Step 3: Add the database column and indexes**

Migration contents:

```sql
alter table public.products
  add column if not exists archived_at timestamptz null;

create index if not exists idx_products_archived_at
  on public.products(archived_at);

create index if not exists idx_products_tenant_archived_at
  on public.products(tenant_id, archived_at);
```

- [ ] **Step 4: Update generated DB/domain typing**

Add `archived_at` to product row typing in:
- `src/types/db/database.types.ts`
- `src/types/domain/product.ts` if any helper type narrowing is needed

- [ ] **Step 5: Implement repository filtering and archive/restore methods**

In `src/repositories/product-repo.ts`:
- thread an optional `archivedStatus?: "active" | "archived" | "all"` through `ProductFilters`
- default storefront and inventory list/get queries to `archived_at is null`
- for archived tab, filter `archived_at is not null`
- add methods:

```ts
async archive(id: string) {
  return this.supabase
    .from("products")
    .update({ archived_at: new Date().toISOString(), is_out_of_stock: true })
    .eq("id", id);
}

async restore(id: string) {
  return this.supabase
    .from("products")
    .update({ archived_at: null })
    .eq("id", id);
}
```

- [ ] **Step 6: Run the repository tests**

Run: `npm run test:jest:unit -- tests/unit/product-archive-repo.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260607210000_product_archive_state.sql src/types/db/database.types.ts src/types/domain/product.ts src/repositories/product-repo.ts tests/unit/product-archive-repo.test.ts
git commit -m "feat: add archived product schema and repository filters"
```

---

### Task 2: Add Archive/Restore Service Rules

**Files:**
- Modify: `src/services/product-service.ts`
- Test: `tests/unit/product-archive-service.test.ts`

- [ ] **Step 1: Write failing service tests**

Add tests for:
- `archiveProduct()` archives a product without deleting it
- `restoreProduct()` clears archive state
- `updateProduct()` rejects archived products
- `getProductById()` can still load archived products for admin read-only views when explicitly requested

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/product-archive-service.test.ts`
Expected: FAIL because service methods/guards do not exist.

- [ ] **Step 3: Implement archive/restore service methods**

In `src/services/product-service.ts` add:

```ts
async archiveProduct(productId: string, tenantId: string) { ... }
async restoreProduct(productId: string, tenantId: string) { ... }
```

Behavior:
- verify tenant ownership
- archive sets `archived_at`
- restore clears `archived_at`
- neither method calls Lightspeed

- [ ] **Step 4: Add read-only guard**

Before allowing update/edit mutations:

```ts
if (existing.archived_at) {
  throw new Error("Archived products are read-only until restored.");
}
```

- [ ] **Step 5: Run the service tests**

Run: `npm run test:jest:unit -- tests/unit/product-archive-service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/product-service.ts tests/unit/product-archive-service.test.ts
git commit -m "feat: add archived product service rules"
```

---

### Task 3: Add Archive/Restore Admin APIs

**Files:**
- Modify: `app/api/admin/products/route.ts`
- Modify: `app/api/admin/products/[id]/route.ts`
- Test: `tests/unit/product-archive-api.test.ts`

- [ ] **Step 1: Write failing API tests**

Cover:
- `PATCH /api/admin/products/:id/archive`
- `PATCH /api/admin/products/:id/restore`
- bulk archive endpoint on `/api/admin/products`
- archived products cannot be updated through normal product PATCH

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/product-archive-api.test.ts`
Expected: FAIL because routes do not exist yet.

- [ ] **Step 3: Add single-item archive/restore endpoints**

Recommended route shape:
- `PATCH /api/admin/products/[id]/route.ts?action=archive`
- `PATCH /api/admin/products/[id]/route.ts?action=restore`

or split into subroutes if cleaner for the repo’s routing style.

Behavior:
- archive/restore is website only
- revalidate product/storefront tags after state change
- do not call `LightspeedProductSyncService`

- [ ] **Step 4: Add bulk archive endpoint**

In `app/api/admin/products/route.ts`, accept a bulk archive payload:

```ts
{
  action: "archive",
  selectionMode: "ids" | "filtered",
  ids?: string[],
  filters?: { q?: string; category?: string; condition?: string; stockStatus?: string }
}
```

Rules:
- `ids` mode archives the explicit selected products
- `filtered` mode archives all matching active products under the current filter set
- archived products are excluded from the candidate set

- [ ] **Step 5: Run API tests**

Run: `npm run test:jest:unit -- tests/unit/product-archive-api.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/products/route.ts app/api/admin/products/[id]/route.ts tests/unit/product-archive-api.test.ts
git commit -m "feat: add product archive admin api"
```

---

### Task 4: Exclude Archived Products From Storefront And Sync

**Files:**
- Modify: `src/repositories/product-repo.ts`
- Modify: `src/services/storefront-service.ts`
- Modify: `src/services/lightspeed-product-sync-service.ts`
- Modify: `src/services/lightspeed-inventory-propagation-service.ts`

- [ ] **Step 1: Add/expand failing tests**

Add assertions that:
- storefront queries never return archived products
- website -> Lightspeed product sync skips archived products
- website inventory propagation skips archived variants/products

- [ ] **Step 2: Run tests to verify failure**

Run:
```bash
npm run test:jest:unit -- tests/unit/product-archive-repo.test.ts tests/unit/lightspeed-product-sync-service.test.ts tests/unit/lightspeed-inventory-sync-service.test.ts
```

Expected: FAIL on archived-state cases.

- [ ] **Step 3: Implement storefront exclusion**

Ensure all public fetch paths apply:

```ts
query = query.is("archived_at", null);
```

This includes:
- product list
- product detail
- featured/storefront filter sources

- [ ] **Step 4: Implement sync exclusion**

In `src/services/lightspeed-product-sync-service.ts` and inventory propagation:
- if product is archived, return a skipped result such as:

```ts
{ status: "skipped", reason: "product_archived" as const }
```

- [ ] **Step 5: Run the tests**

Run:
```bash
npm run test:jest:unit -- tests/unit/product-archive-repo.test.ts tests/unit/lightspeed-product-sync-service.test.ts tests/unit/lightspeed-inventory-sync-service.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/repositories/product-repo.ts src/services/storefront-service.ts src/services/lightspeed-product-sync-service.ts src/services/lightspeed-inventory-propagation-service.ts
git commit -m "feat: exclude archived products from storefront and lightspeed sync"
```

---

### Task 5: Add Archived Tab And Read-Only Admin UX

**Files:**
- Modify: `app/admin/inventory/client.tsx`
- Modify: `app/admin/inventory/page.tsx`
- Modify: `app/admin/inventory/[id]/edit/actions.ts`
- Modify: `app/admin/inventory/[id]/edit/client.tsx`
- Test: `tests/unit/admin-inventory-archive-selection.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Cover:
- archived products appear only in `Archived`
- `In Stock` / `Out of Stock` exclude archived products
- archived products show `Restore` instead of `Edit`/`Archive`
- archived products are read-only in edit flow

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/admin-inventory-archive-selection.test.tsx`
Expected: FAIL because archive tab/state does not exist.

- [ ] **Step 3: Add Archived stock-status/tab state**

Update `StockStatus` in `app/admin/inventory/client.tsx` from:

```ts
type StockStatus = "in_stock" | "out_of_stock";
```

to:

```ts
type StockStatus = "in_stock" | "out_of_stock" | "archived";
```

Thread it through filter state, URL params, and tab rendering.

- [ ] **Step 4: Add archive/restore row actions**

For active products:
- show `Archive`

For archived products:
- show `Restore`
- disable normal edit affordance or replace with view/read-only affordance

- [ ] **Step 5: Enforce read-only edit experience**

If archived product loads in edit screen:
- render read-only state
- show restore CTA
- block submit/update mutation

- [ ] **Step 6: Run the UI tests**

Run: `npm run test:jest:unit -- tests/unit/admin-inventory-archive-selection.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/admin/inventory/client.tsx app/admin/inventory/page.tsx app/admin/inventory/[id]/edit/actions.ts app/admin/inventory/[id]/edit/client.tsx tests/unit/admin-inventory-archive-selection.test.tsx
git commit -m "feat: add archived inventory tab and read-only admin flow"
```

---

### Task 6: Add Cross-Page Selection And Bulk Archive UI

**Files:**
- Modify: `app/admin/inventory/client.tsx`
- Test: `tests/unit/admin-inventory-archive-selection.test.tsx`

- [ ] **Step 1: Extend the failing UI tests**

Add cases for:
- header checkbox selects current page
- when page is selected, UI shows `Select all products`
- clicking it switches into full filtered-result selection mode
- `Archive Selected` appears next to `Delete Selected`
- archive uses `ids` mode for page-local selection
- archive uses `filtered` mode for global filtered selection

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/admin-inventory-archive-selection.test.tsx`
Expected: FAIL because full-result selection/archive action does not exist.

- [ ] **Step 3: Add selection model**

In `app/admin/inventory/client.tsx`, replace raw `selectedIds`-only thinking with:

```ts
type SelectionMode = "none" | "page" | "filtered";
```

State sketch:

```ts
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [selectionMode, setSelectionMode] = useState<SelectionMode>("none");
const [selectedFilteredCount, setSelectedFilteredCount] = useState<number | null>(null);
```

- [ ] **Step 4: Add “Select all products” affordance**

When the current page is fully selected and total count exceeds page size, render:

```tsx
<button type="button">Select all {totalCount} matching products</button>
```

After activation, render:

```tsx
<button type="button">Clear selection</button>
```

- [ ] **Step 5: Add `Archive Selected` action**

Next to existing delete bulk action, add:

```tsx
<button type="button">Archive Selected</button>
```

POST payload rules:
- page mode: `{ action: "archive", selectionMode: "ids", ids: selectedIds }`
- filtered mode: `{ action: "archive", selectionMode: "filtered", filters: currentFilters }`

- [ ] **Step 6: Refresh list and selection after archive**

After successful bulk archive:
- clear selection
- reload product list
- show success toast with affected count

- [ ] **Step 7: Run UI test**

Run: `npm run test:jest:unit -- tests/unit/admin-inventory-archive-selection.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add app/admin/inventory/client.tsx tests/unit/admin-inventory-archive-selection.test.tsx
git commit -m "feat: add cross-page bulk archive selection"
```

---

### Task 7: Final Verification

**Files:**
- Review all touched files above

- [ ] **Step 1: Run focused archive and sync tests**

Run:

```bash
npm run test:jest:unit -- tests/unit/product-archive-repo.test.ts tests/unit/product-archive-service.test.ts tests/unit/product-archive-api.test.ts tests/unit/admin-inventory-archive-selection.test.tsx tests/unit/lightspeed-product-sync-service.test.ts tests/unit/lightspeed-inventory-sync-service.test.ts
```

Expected: PASS

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Run one broader inventory regression pass**

Run:

```bash
npm run test:jest:unit -- tests/unit/product-service.test.ts tests/unit/lightspeed-inbound-sync-service.test.ts tests/unit/lightspeed-sale-sync-service.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit final verification adjustments**

```bash
git add .
git commit -m "test: verify archived product workflow"
```

---

## Self-Review

- Spec coverage: schema, read-only archive state, archived tab, bulk archive, cross-page selection, storefront exclusion, Lightspeed exclusion, restore flow are all covered.
- Placeholder scan: no `TODO`/`TBD` placeholders remain.
- Type consistency: plan consistently uses `archived_at`, `StockStatus = "in_stock" | "out_of_stock" | "archived"`, and `selectionMode = "ids" | "filtered"` at the API boundary.
