# Lightspeed Reconciliation Diff Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade manual Lightspeed reconciliation so preview distinguishes `No Change`, `Add`, `Edit`, `Restore`, `Archive`, and `Conflicts`, and shows side-by-side details for edits/restores before apply.

**Architecture:** Extend the reconciliation service from identity-only matching to identity-plus-diff classification. Reuse existing Lightspeed normalization to derive a comparable website-shaped model, expose richer preview payloads through the sync API, then update the admin inventory sync modal to show true change buckets and a details/diff viewer before apply.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Jest, Supabase repositories, existing Lightspeed mapping/inbound sync services.

---

## File Structure

- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
  - Add comparable shapes, diff helpers, new preview buckets, and edit apply support.
- Modify: `src/services/lightspeed-inbound-sync-service.ts`
  - Reuse existing overwrite logic cleanly for active matched products during reconciliation edits.
- Modify: `src/repositories/product-repo.ts`
  - Support fetching both active and archived reconciliation candidates and any additional detail fields needed for side-by-side preview.
- Modify: `app/api/admin/lightspeed/sync/route.ts`
  - Extend preview/apply schemas and API response payloads for edit and richer detail data.
- Modify: `app/admin/inventory/client.tsx`
  - Replace coarse preview buckets, add key/legend, wire details modal, and add edit progress/apply flow.
- Create: `src/components/admin/inventory/SyncProductPreviewModal.tsx`
  - Dedicated details/diff modal used by the sync preview.
- Modify: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`
  - Cover no-change/edit/restore/import/archive/conflict classification and edit apply behavior.
- Modify: `tests/unit/lightspeed-sync-api.test.ts`
  - Cover new preview payload and `apply_edit_chunk`.

### Task 1: Reconciliation Diff Model

**Files:**
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Modify: `src/repositories/product-repo.ts`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] **Step 1: Write failing classification tests for `no_change`, `edit`, and `restore`**

Add cases to `tests/unit/lightspeed-reconciliation-sync-service.test.ts` that distinguish:

```ts
it("classifies an identical active match as no_change", async () => {
  // active website product with same normalized values as Lightspeed
  expect(result.noChangeCount).toBe(1);
  expect(result.editCount).toBe(0);
});

it("classifies a changed active match as edit", async () => {
  // same identity, different stock/price/images
  expect(result.editCount).toBe(1);
  expect(result.edits[0].diff.fields).toEqual(
    expect.arrayContaining(["stock", "sale_price_cents", "images"]),
  );
});

it("classifies an archived match as restore instead of import", async () => {
  expect(result.restoreCount).toBe(1);
  expect(result.importCount).toBe(0);
});
```

- [ ] **Step 2: Run the reconciliation service tests to verify failure**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts`

Expected: FAIL because `noChangeCount`, `editCount`, `edits`, and diff payloads do not exist yet.

- [ ] **Step 3: Add comparable shapes and diff helpers in the reconciliation service**

In `src/services/lightspeed-reconciliation-sync-service.ts`, add internal comparable types and helpers similar to:

```ts
type ComparableVariant = {
  sku: string;
  size_label: string;
  sale_price_cents: number;
  unit_cost_cents: number;
  stock: number;
  sort_order: number;
};

type ComparableProduct = {
  name: string;
  description: string | null;
  brand: string;
  model: string | null;
  category: string;
  condition: string;
  size_type: string;
  is_active: boolean;
  is_out_of_stock: boolean;
  image_urls: string[];
  tags: string[];
  variants: ComparableVariant[];
};

type ReconciliationDiff = {
  fields: string[];
  variantChanges: Array<{
    sku: string;
    fields: string[];
  }>;
};
```

Add helper methods:

```ts
private toComparableWebsiteProduct(product: ProductWithDetails): ComparableProduct
private toComparableRemoteProduct(remote: LightspeedRemoteProduct): ComparableProduct
private diffComparableProducts(
  website: ComparableProduct,
  remote: ComparableProduct,
): ReconciliationDiff | null
```

- [ ] **Step 4: Update classification from identity-only to identity-plus-diff**

Refactor the classifier to return:

```ts
{
  noChange: [...],
  edits: [...],
  imports: [...],
  restores: [...],
  conflicts: [...],
  matchedWebsiteProductIds: Set<string>,
  conflictWebsiteProductIds: Set<string>,
}
```

Use the diff helper after identity resolution:

```ts
const diff = this.diffComparableProducts(websiteComparable, remoteComparable);
if (isArchivedMatch) {
  restores.push(...);
} else if (diff) {
  edits.push(...);
} else {
  noChange.push(...);
}
```

- [ ] **Step 5: Re-run reconciliation tests**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts`

Expected: PASS for the new classification tests.

- [ ] **Step 6: Commit**

```bash
git add src/services/lightspeed-reconciliation-sync-service.ts src/repositories/product-repo.ts tests/unit/lightspeed-reconciliation-sync-service.test.ts
git commit -m "feat: classify reconciliation preview by diffs"
```

### Task 2: Preview API And Apply Edit Path

**Files:**
- Modify: `app/api/admin/lightspeed/sync/route.ts`
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Modify: `src/services/lightspeed-inbound-sync-service.ts`
- Test: `tests/unit/lightspeed-sync-api.test.ts`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] **Step 1: Write failing API tests for the new preview shape and edit apply action**

Add tests in `tests/unit/lightspeed-sync-api.test.ts` for:

```ts
it("returns preview counts for no_change, edit, restore, import, archive, conflict", async () => {
  expect(body.preview.editCount).toBe(2);
  expect(body.preview.noChangeCount).toBe(10);
});

it("accepts apply_edit_chunk", async () => {
  expect(applyEditChunkMock).toHaveBeenCalledWith({
    tenantId: "tenant-1",
    edits: expect.any(Array),
  });
});
```

- [ ] **Step 2: Run API tests to verify failure**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-sync-api.test.ts`

Expected: FAIL because `apply_edit_chunk` and the new preview counts are not supported yet.

- [ ] **Step 3: Extend preview types and API schema**

In `src/services/lightspeed-reconciliation-sync-service.ts`, replace the coarse preview shape with:

```ts
export type LightspeedReconciliationPreview = {
  noChangeCount: number;
  importCount: number;
  editCount: number;
  restoreCount: number;
  archiveCount: number;
  conflictCount: number;
  noChanges: Array<...>;
  imports: Array<...>;
  edits: Array<{
    websiteProductId: string;
    remoteProductId: string;
    title: string;
    reason: "link" | "sku";
    website: ComparableProduct;
    remote: ComparableProduct;
    diff: ReconciliationDiff;
  }>;
  restores: Array<...>;
  archives: Array<...>;
  conflicts: Array<...>;
};
```

In `app/api/admin/lightspeed/sync/route.ts`, extend the schema:

```ts
z.object({
  action: z.literal("apply_edit_chunk"),
  edits: z.array(
    z.object({
      websiteProductId: z.string().uuid(),
      remoteProductId: z.string(),
    }).strict(),
  ).min(1),
}).strict()
```

- [ ] **Step 4: Add `applyEditChunk` in the reconciliation service**

Implement:

```ts
async applyEditChunk(input: {
  tenantId: string;
  edits: Array<{ websiteProductId: string; remoteProductId: string }>;
}): Promise<LightspeedReconciliationChunkResult> {
  // fetch remote product
  // attach SKU fallback links when required
  // apply inbound sync payload to overwrite website product
}
```

Reuse `LightspeedInboundSyncService.applyProductPayload()` for the overwrite operation so edits and restores stay aligned with the inbound normalization path.

- [ ] **Step 5: Wire `apply_edit_chunk` through the route**

Add the new branch in `POST`:

```ts
: parsed.data.action === "apply_edit_chunk"
  ? await service.applyEditChunk({
      tenantId,
      edits: parsed.data.edits,
    })
```

- [ ] **Step 6: Re-run sync API and service tests**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-sync-api.test.ts tests/unit/lightspeed-reconciliation-sync-service.test.ts`

Expected: PASS with the richer preview payload and edit apply route.

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/lightspeed/sync/route.ts src/services/lightspeed-reconciliation-sync-service.ts src/services/lightspeed-inbound-sync-service.ts tests/unit/lightspeed-sync-api.test.ts tests/unit/lightspeed-reconciliation-sync-service.test.ts
git commit -m "feat: add reconciliation edit preview and apply route"
```

### Task 3: Sync Preview UI Buckets And Legend

**Files:**
- Modify: `app/admin/inventory/client.tsx`

- [ ] **Step 1: Write the new preview state shape in the client**

Replace the old client-side preview types with fields for:

```ts
type ReconciliationPreview = {
  noChangeCount: number;
  importCount: number;
  editCount: number;
  restoreCount: number;
  archiveCount: number;
  conflictCount: number;
  noChanges: Array<...>;
  imports: Array<...>;
  edits: Array<...>;
  restores: Array<...>;
  archives: Array<...>;
  conflicts: Array<...>;
};
```

- [ ] **Step 2: Update preview scan aggregation logic**

In `loadSyncPreview()`, aggregate the new buckets:

```ts
const noChanges: ReconciliationPreview["noChanges"] = [];
const edits: ReconciliationPreview["edits"] = [];
const restores: ReconciliationPreview["restores"] = [];

for (const item of chunkPreview?.noChanges ?? []) {
  noChanges.push(item);
}
for (const item of chunkPreview?.edits ?? []) {
  edits.push(item);
  matchedWebsiteProductIds.add(item.websiteProductId);
}
```

Update `previewScanState` running counts to track:

```ts
noChangeCount
importCount
editCount
restoreCount
archiveCount
conflictCount
```

- [ ] **Step 3: Replace the old cards and add a visible legend**

In the modal summary section in `app/admin/inventory/client.tsx`, render cards for:

```tsx
No Change
Add To Website
Edit On Website
Restore On Website
Archive On Website
Conflicts
```

Add a legend block under the cards explaining the meaning of each bucket in plain language.

- [ ] **Step 4: Replace the old three-column preview lists**

Render sections for:

```tsx
Add To Website
Edit On Website
Restore On Website
Archive On Website
Conflicts
```

Leave `No Change` summarized by count for the first version.

Each list item should render:

```tsx
<button type="button" onClick={() => openSyncDetails(item, "edit")}>
  Details
</button>
```

or the appropriate mode (`add`, `restore`, `archive`, `conflict`).

- [ ] **Step 5: Update apply flow to include edit chunks**

In `applySync()`, add:

```ts
const editChunks = chunkArray(syncPreview.edits, EDIT_CHUNK_SIZE);
```

Apply in order:

1. restore
2. import
3. edit
4. archive

Update progress labels:

```ts
phase: "editing"
currentLabel: `Editing ${start}-${end} of ${syncPreview.editCount}`
```

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`

Expected: PASS with the new client preview shape and apply ordering.

- [ ] **Step 7: Commit**

```bash
git add app/admin/inventory/client.tsx
git commit -m "feat: upgrade sync preview buckets and progress"
```

### Task 4: Sync Details And Side-By-Side Diff Modal

**Files:**
- Create: `src/components/admin/inventory/SyncProductPreviewModal.tsx`
- Modify: `app/admin/inventory/client.tsx`

- [ ] **Step 1: Create the dedicated sync preview modal component**

Create `src/components/admin/inventory/SyncProductPreviewModal.tsx` with a focused API:

```tsx
type SyncProductPreviewModalProps = {
  open: boolean;
  mode: "add" | "edit" | "restore" | "archive" | "conflict";
  title: string;
  websiteProduct?: ComparableProduct | null;
  remoteProduct?: ComparableProduct | null;
  diff?: ReconciliationDiff | null;
  onClose: () => void;
};
```

- [ ] **Step 2: Render product details for add/archive**

In the new modal component, render single-sided details for `add` and `archive` modes using reusable sections:

```tsx
Product images
Unit Cost / Sale Price
Brand / Model / Category / Condition
Description
Tags
All variants table
```

- [ ] **Step 3: Render side-by-side diff for edit/restore**

In `SyncProductPreviewModal.tsx`, render two columns:

```tsx
<section>
  <h3>Website</h3>
  <ProductPreviewPanel product={websiteProduct} highlightedFields={diff?.fields ?? []} />
</section>
<section>
  <h3>Lightspeed</h3>
  <ProductPreviewPanel product={remoteProduct} highlightedFields={diff?.fields ?? []} />
</section>
```

Show all variants on each side and visually mark changed rows/fields.

- [ ] **Step 4: Wire the modal into the inventory client**

In `app/admin/inventory/client.tsx`, add state:

```ts
const [syncDetailsSelection, setSyncDetailsSelection] = useState<...>(null);
```

Open it from preview rows and render:

```tsx
<SyncProductPreviewModal
  open={Boolean(syncDetailsSelection)}
  mode={syncDetailsSelection?.mode ?? "add"}
  title={syncDetailsSelection?.title ?? ""}
  websiteProduct={syncDetailsSelection?.websiteProduct ?? null}
  remoteProduct={syncDetailsSelection?.remoteProduct ?? null}
  diff={syncDetailsSelection?.diff ?? null}
  onClose={() => setSyncDetailsSelection(null)}
/>
```

- [ ] **Step 5: Run targeted verification**

Run:

```bash
npm run typecheck
npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Manual browser verification**

Run the app and verify:

```bash
npm run dev
```

Manual checks:

1. Open `Sync Inventory`
2. Confirm cards show `No Change`, `Add`, `Edit`, `Restore`, `Archive`, `Conflicts`
3. Click a preview row in each actionable section
4. Confirm `Add` shows a single product details view
5. Confirm `Edit` and `Restore` show a side-by-side diff with all variants
6. Confirm apply progress includes `Editing`

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/inventory/SyncProductPreviewModal.tsx app/admin/inventory/client.tsx
git commit -m "feat: add sync preview details and diff modal"
```

## Self-Review

- **Spec coverage:** This plan covers the spec’s classification change, field-level comparison model, new preview buckets, legend, side-by-side diff modal, and apply edit phase.
- **Placeholder scan:** No `TBD` or vague “add validation” steps remain; each task names exact files, tests, and code shapes.
- **Type consistency:** The plan consistently uses `noChange`, `edit`, `restore`, `import`, `archive`, and `conflict` across service, API, and client layers.

