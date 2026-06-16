# Inventory SKU Count And Lightspeed Family Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin inventory header count distinct visible SKUs, remove the dedicated out-of-stock inventory tab while keeping archived separate, and harden manual Lightspeed imports so variant families always import with their full child set.

**Architecture:** Keep the inventory page product-grouped but change backend totals to variant-SKU semantics for the active filter set. Preserve the current `stockStatus=in_stock` route value for the main non-archived inventory tab, but change its meaning to “all non-archived inventory.” Harden the Lightspeed manual import path by resolving a complete family payload before it reaches inbound normalization/apply logic, while preserving the earlier child-update safeguard.

**Tech Stack:** Next.js App Router, TypeScript, Supabase repositories, Jest unit tests

---

### Task 1: Switch Admin Inventory Count To Distinct SKU Totals

**Files:**
- Modify: `src/repositories/product-repo.ts`
- Modify: `src/services/product-service.ts`
- Modify: `app/admin/inventory/actions.ts`
- Test: `tests/unit/product-reconciliation-repo.test.ts` or new focused repository/service test if existing coverage is not appropriate

- [ ] **Step 1: Write the failing test for SKU-based totals**

Create or extend a unit test that proves two products with multiple variants return a total equal to matching distinct SKUs, not matching product rows.

```ts
it("counts distinct matching SKUs for inventory totals instead of product rows", async () => {
  const repo = new ProductRepository(mockSupabase as never);

  // Mock the product list query to return 2 product rows
  // Mock the SKU count query to return 5 matching SKUs
  // Expect repo.list(...) to return total: 5
});
```

- [ ] **Step 2: Run the focused test and verify it fails for the right reason**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/<new-or-updated-test-file>.test.ts`

Expected: FAIL because `ProductRepository.list()` still returns the product-row count.

- [ ] **Step 3: Implement a distinct-SKU total query in `ProductRepository.list()`**

Add a distinct SKU count path based on `product_variants` joined to filtered products. Keep product row pagination unchanged.

```ts
const skuTotal = await this.countDistinctInventorySkus({
  ...filters,
  archivedStatus,
  includeUnpublished,
  nowIso,
});

return {
  products: transformed,
  total: skuTotal,
  page,
  limit,
};
```

Add a focused helper so the count logic is not duplicated inline:

```ts
private async countDistinctInventorySkus(input: {
  filters: ProductFilters;
  archivedStatus: ProductFilters["archivedStatus"];
  includeUnpublished: boolean;
  nowIso: string;
}): Promise<number> {
  // Build joined product_variants -> products query
  // Apply the same inventory filters as the main admin inventory view
  // Count distinct non-empty SKUs
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/<new-or-updated-test-file>.test.ts`

Expected: PASS with the repo/service returning SKU totals.

- [ ] **Step 5: Commit**

```bash
git add src/repositories/product-repo.ts src/services/product-service.ts app/admin/inventory/actions.ts tests/unit/<new-or-updated-test-file>.test.ts
git commit -m "feat: count inventory totals by visible sku"
```

### Task 2: Remove The Out-Of-Stock Inventory Tab While Keeping Archived Separate

**Files:**
- Modify: `app/admin/inventory/page.tsx`
- Modify: `app/admin/inventory/actions.ts`
- Modify: `app/admin/inventory/client.tsx`
- Modify: `src/repositories/product-repo.ts`
- Modify: `src/services/product-service.ts`
- Test: `tests/unit/<inventory-filter-or-product-service>.test.ts`

- [ ] **Step 1: Write the failing test for the main inventory view including zero-stock non-archived products**

Add or extend a test that proves the non-archived inventory view includes products/variants even when stock is zero.

```ts
it("treats the main admin inventory tab as all non-archived inventory", async () => {
  const service = new ProductService(mockSupabase as never);

  const result = await service.listProducts({
    tenantId: "tenant-1",
    stockStatus: "in_stock",
    includeOutOfStock: true,
    searchMode: "inventory",
  });

  expect(result.total).toBeGreaterThan(0);
  expect(result.products.some((product) => product.is_out_of_stock)).toBe(true);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/<inventory-filter-or-product-service>.test.ts`

Expected: FAIL because `stockStatus === "in_stock"` still excludes `is_out_of_stock = true`.

- [ ] **Step 3: Implement the tab/filter behavior change**

Update the inventory UI to remove the `Out of Stock` button and keep only `In Stock` and `Archived`.

```tsx
<button onClick={() => setStockStatusFilter("in_stock")}>In Stock</button>
<button onClick={() => setStockStatusFilter("archived")}>Archived</button>
```

Update backend filtering so the admin inventory main view does not filter out zero-stock non-archived products.

```ts
if (searchMode === "inventory" && filters.stockStatus === "in_stock") {
  // Do not force is_out_of_stock = false here.
}

if (filters.stockStatus === "archived") {
  query = this.applyArchivedFilter(query, "archived");
} else {
  query = this.applyArchivedFilter(query, "active");
}
```

Keep existing archive actions working by preserving `stockStatus: "archived"` handling.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/<inventory-filter-or-product-service>.test.ts`

Expected: PASS with zero-stock non-archived products included in the main inventory tab semantics.

- [ ] **Step 5: Commit**

```bash
git add app/admin/inventory/page.tsx app/admin/inventory/actions.ts app/admin/inventory/client.tsx src/repositories/product-repo.ts src/services/product-service.ts tests/unit/<inventory-filter-or-product-service>.test.ts
git commit -m "feat: simplify inventory tabs and keep zero-stock skus visible"
```

### Task 3: Harden Manual Lightspeed Import To Always Resolve Full Variant Families

**Files:**
- Modify: `src/lib/lightspeed/client.ts`
- Modify: `src/services/lightspeed-manual-import-service.ts`
- Modify: `src/services/lightspeed-inbound-sync-service.ts` only if a shared helper is needed
- Test: `tests/unit/lightspeed-inbound-sync-service.test.ts`
- Test: `tests/unit/<lightspeed-manual-import-service>.test.ts` if manual import lacks direct coverage

- [ ] **Step 1: Write the failing test for incomplete family import**

Add a regression test that simulates a top-level variant family whose first fetched payload is incomplete and proves manual import resolves and applies all child variants.

```ts
it("resolves a complete Lightspeed family before importing variants", async () => {
  // Mock listProducts() returning a top-level family
  // Mock getProduct() returning an incomplete parent payload
  // Mock a family-resolution call returning all 9 variants
  // Expect inbound apply to receive all variants, not 1
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/<lightspeed-manual-import-service>.test.ts`

Expected: FAIL because manual import still trusts the incomplete fetched payload.

- [ ] **Step 3: Implement an explicit full-family resolution path**

Add a client/service helper that guarantees a complete family payload before import.

```ts
async resolveFullProductFamily(product: LightspeedRemoteProduct): Promise<LightspeedRemoteProduct> {
  const fetched = (await this.getProduct(product.id)) ?? product;
  if (!Array.isArray(fetched.variants) || fetched.variants.length === 0) {
    return fetched;
  }

  // If variants are incomplete, expand them from the authoritative source
  return {
    ...fetched,
    variants: resolvedVariants,
  };
}
```

Use that helper in manual import:

```ts
const fullProduct = await client.resolveFullProductFamily(product);
const syncResult = await this.inboundSyncService.applyProductPayload({
  tenantId: input.tenantId,
  payload: fullProduct,
  topic: "product.update",
  remoteModifiedAt: fullProduct.updated_at ?? new Date().toISOString(),
});
```

The implementation must fail explicitly if a known variant family cannot be resolved completely enough to import safely.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/<lightspeed-manual-import-service>.test.ts`

Expected: PASS with full variant-family payloads reaching inbound apply.

- [ ] **Step 5: Re-run the existing inbound regression suite**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-inbound-sync-service.test.ts`

Expected: PASS, including the earlier child-update safeguard that prevents sibling deletion.

- [ ] **Step 6: Commit**

```bash
git add src/lib/lightspeed/client.ts src/services/lightspeed-manual-import-service.ts tests/unit/lightspeed-inbound-sync-service.test.ts tests/unit/<lightspeed-manual-import-service>.test.ts
git commit -m "fix: resolve full lightspeed families during manual import"
```

### Task 4: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the targeted inventory tests**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/<new-or-updated-test-file>.test.ts tests/unit/<inventory-filter-or-product-service>.test.ts`

Expected: PASS

- [ ] **Step 2: Run the targeted Lightspeed tests**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/<lightspeed-manual-import-service>.test.ts tests/unit/lightspeed-inbound-sync-service.test.ts`

Expected: PASS

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: exit code 0

- [ ] **Step 4: Run lint on touched files if the repo supports targeted linting**

Run: `npx eslint app/admin/inventory/page.tsx app/admin/inventory/actions.ts app/admin/inventory/client.tsx src/repositories/product-repo.ts src/services/product-service.ts src/lib/lightspeed/client.ts src/services/lightspeed-manual-import-service.ts src/services/lightspeed-inbound-sync-service.ts tests/unit/lightspeed-inbound-sync-service.test.ts tests/unit/<new-or-updated-test-file>.test.ts tests/unit/<inventory-filter-or-product-service>.test.ts tests/unit/<lightspeed-manual-import-service>.test.ts`

Expected: exit code 0

- [ ] **Step 5: Commit final cleanup if needed**

```bash
git add .
git commit -m "chore: finalize inventory sku count and lightspeed import fixes"
```
