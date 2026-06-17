# Lightspeed Size Type Conflict Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sync derive website `size_type` from Lightspeed category, surface missing/unknown category as a resolvable preview conflict, and allow one-run conflict overrides during manual sync apply.

**Architecture:** Centralize category-to-website typing logic in shared sync helpers, then thread missing-category conflict state through reconciliation preview, sync API payloads, and the admin sync modal. Keep overrides ephemeral in client/apply requests only; do not persist them in the database.

**Tech Stack:** Next.js App Router, TypeScript, Jest, Supabase repositories, existing Lightspeed sync services

---

## File Structure

**Existing files to modify**

- `src/services/lightspeed-inbound-sync-service.ts`
  - Creates/updates website products from Lightspeed payloads.
  - Must stop using fragile size-label heuristics as the primary source of truth.
- `src/services/lightspeed-reconciliation-sync-service.ts`
  - Builds preview buckets and applies reconciliation work.
  - Must classify missing category as conflict and accept one-run overrides during apply.
- `app/api/admin/lightspeed/sync/route.ts`
  - Validates manual sync request payloads.
  - Must accept conflict-resolution overrides in apply chunk requests.
- `app/admin/inventory/client.tsx`
  - Builds and applies the sync preview modal.
  - Must render missing-category conflict resolution controls and send overrides during apply.
- `tests/unit/lightspeed-inbound-sync-service.test.ts`
  - Primary unit coverage for inbound create/update behavior.
- `tests/unit/lightspeed-reconciliation-sync-service.test.ts`
  - Primary unit coverage for preview classification and apply behavior.
- `tests/unit/lightspeed-sync-api.test.ts`
  - API payload contract tests for `/api/admin/lightspeed/sync`.

**New file to create**

- `src/services/lightspeed-category-resolution.ts`
  - Shared helper for:
    - normalizing remote category into website category
    - deriving website `size_type`
    - determining whether category is missing/unknown

## Task 1: Add Shared Category-First Resolution Helper

**Files:**
- Create: `src/services/lightspeed-category-resolution.ts`
- Test: `tests/unit/lightspeed-inbound-sync-service.test.ts`

- [ ] **Step 1: Write the failing test for clothing and EU shoe classification**

Add these test cases to `tests/unit/lightspeed-inbound-sync-service.test.ts`:

```ts
  it("uses Lightspeed clothing category to save clothing size_type for SMALL", async () => {
    getByLightspeedVariantIdMock.mockResolvedValue(null);
    getByExternalSkuMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "product-clothing-1" });
    createVariantMock.mockResolvedValue({ id: "variant-clothing-1" });

    const service = new LightspeedInboundSyncService({} as never);

    await service.applyProductPayload({
      tenantId: "tenant-1",
      payload: {
        id: "ls-clothing-1",
        name: "Abominable Carpenter Pants",
        brand_name: "Other",
        product_category: "Clothing",
        sku: "N-OTH-CLT-SM-67",
        variant_option_one_name: "Size",
        variant_option_one_value: "SMALL",
        inventory_Main_Outlet: 2,
      },
      topic: "product.update",
      remoteModifiedAt: "2026-06-17T12:00:00.000Z",
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "clothing",
        size_type: "clothing",
      }),
    );
  });

  it("uses Lightspeed sneakers category to save shoe size_type for EU sizes", async () => {
    getByLightspeedVariantIdMock.mockResolvedValue(null);
    getByExternalSkuMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "product-shoe-1" });
    createVariantMock.mockResolvedValue({ id: "variant-shoe-1" });

    const service = new LightspeedInboundSyncService({} as never);

    await service.applyProductPayload({
      tenantId: "tenant-1",
      payload: {
        id: "ls-shoe-1",
        name: "Jordan EU Pair",
        brand_name: "Jordan",
        product_category: "Sneakers",
        sku: "N-JDN-EU35-01",
        variant_option_one_name: "Size",
        variant_option_one_value: "EU 35 (US 5.5W)",
        inventory_Main_Outlet: 1,
      },
      topic: "product.update",
      remoteModifiedAt: "2026-06-17T12:00:00.000Z",
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "sneakers",
        size_type: "shoe",
      }),
    );
  });
```

- [ ] **Step 2: Run the inbound sync test file to verify failure**

Run:

```bash
npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-inbound-sync-service.test.ts --runInBand
```

Expected:

```txt
FAIL
Expected: size_type: "clothing"
Received: size_type: "shoe"
```

- [ ] **Step 3: Add the shared category resolution helper**

Create `src/services/lightspeed-category-resolution.ts` with:

```ts
import type { Category, SizeType } from "@/types/domain/product";

export type LightspeedResolvedCategory =
  | {
      status: "resolved";
      category: Category;
      sizeType: SizeType;
    }
  | {
      status: "missing";
    };

export function resolveWebsiteCategoryAndSizeType(
  rawCategory: string | null | undefined,
): LightspeedResolvedCategory {
  const normalized = rawCategory?.trim().toLowerCase() ?? "";

  if (normalized === "clothing") {
    return { status: "resolved", category: "clothing", sizeType: "clothing" };
  }
  if (normalized === "sneakers") {
    return { status: "resolved", category: "sneakers", sizeType: "shoe" };
  }
  if (normalized === "accessories") {
    return { status: "resolved", category: "accessories", sizeType: "custom" };
  }
  if (normalized === "electronics") {
    return { status: "resolved", category: "electronics", sizeType: "custom" };
  }

  return { status: "missing" };
}
```

- [ ] **Step 4: Use the helper in inbound sync with minimal behavior change**

Update `src/services/lightspeed-inbound-sync-service.ts` so category and `size_type` come from the helper:

```ts
import {
  resolveWebsiteCategoryAndSizeType,
} from "@/services/lightspeed-category-resolution";
```

Replace:

```ts
const category = this.toWebsiteCategory(first.category);
const sizeType = this.inferSizeType(normalized.map((item) => item.sizeLabel));
```

With:

```ts
const resolvedCategory = resolveWebsiteCategoryAndSizeType(first.category);
const category =
  resolvedCategory.status === "resolved" ? resolvedCategory.category : "sneakers";
const sizeType =
  resolvedCategory.status === "resolved" ? resolvedCategory.sizeType : "custom";
```

Also delete the now-unused `toWebsiteCategory()` and `inferSizeType()` methods from this file once TypeScript confirms they are unused.

- [ ] **Step 5: Run the inbound sync test file to verify it passes**

Run:

```bash
npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-inbound-sync-service.test.ts --runInBand
```

Expected:

```txt
PASS
```

- [ ] **Step 6: Commit**

```bash
git add src/services/lightspeed-category-resolution.ts src/services/lightspeed-inbound-sync-service.ts tests/unit/lightspeed-inbound-sync-service.test.ts
git commit -m "fix: derive sync size type from Lightspeed category"
```

## Task 2: Classify Missing Category As A Preview Conflict

**Files:**
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] **Step 1: Write the failing preview conflict test**

Add this test to `tests/unit/lightspeed-reconciliation-sync-service.test.ts`:

```ts
  it("classifies products with missing Lightspeed category as missing-category conflicts", async () => {
    listProductsMock.mockResolvedValueOnce({
      products: [
        {
          id: "ls-missing-category",
          name: "Unknown Category Product",
          updated_at: "2026-06-17T14:00:00.000Z",
          variants: [
            {
              id: "ls-missing-category-variant",
              sku: "MISS-001",
              variant_option_one_name: "Size",
              variant_option_one_value: "SMALL",
              inventory_Main_Outlet: 1,
            },
          ],
        },
      ],
      after: null,
      pageSize: 50,
      hasNextPage: false,
      nextAfter: null,
      totalProducts: 1,
    });
    listForReconciliationMock.mockReset();
    listForReconciliationMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    listByTenantMock.mockResolvedValueOnce([]);

    const service = new LightspeedReconciliationSyncService({} as never);
    const result = await service.preview({ tenantId: "tenant-1" });

    expect(result.importCount).toBe(0);
    expect(result.conflictCount).toBe(1);
    expect(result.conflicts[0]).toEqual(
      expect.objectContaining({
        remoteProductId: "ls-missing-category",
        conflictReason: "missing_category",
      }),
    );
  });
```

- [ ] **Step 2: Run the reconciliation test file to verify failure**

Run:

```bash
npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-reconciliation-sync-service.test.ts --runInBand
```

Expected:

```txt
FAIL
Expected conflictReason: "missing_category"
Received import/conflict payload without that reason
```

- [ ] **Step 3: Extend conflict typing and preview classification**

In `src/services/lightspeed-reconciliation-sync-service.ts`:

1. Import the helper:

```ts
import {
  resolveWebsiteCategoryAndSizeType,
} from "@/services/lightspeed-category-resolution";
```

2. Extend the conflict shape to include:

```ts
conflictReason?: "multiple_candidates" | "missing_category";
resolutionOptions?: {
  categories: Array<"sneakers" | "clothing" | "accessories" | "electronics">;
};
```

3. In `toComparableRemoteProduct()`, replace direct category/size-type inference with helper output. If category is missing, return a comparable object with:

```ts
category: "sneakers",
sizeType: "custom",
```

only as a placeholder comparable snapshot, not as the classification decision.

4. In `classifyRemoteProducts()`, before link/sku matching, add:

```ts
const resolvedCategory = resolveWebsiteCategoryAndSizeType(first.category);
if (resolvedCategory.status === "missing") {
  conflicts.push({
    remoteProductId: remoteProduct.id,
    title: this.getRemoteTitle(remoteProduct, normalizedVariants),
    candidateWebsiteProductIds: [],
    skuMatches: [],
    remote: remoteComparable,
    conflictReason: "missing_category",
    resolutionOptions: {
      categories: ["sneakers", "clothing", "accessories", "electronics"],
    },
  });
  continue;
}
```

5. Replace the local `inferSizeType()` in this file with helper-driven logic wherever possible.

- [ ] **Step 4: Run the reconciliation test file to verify it passes**

Run:

```bash
npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-reconciliation-sync-service.test.ts --runInBand
```

Expected:

```txt
PASS
```

- [ ] **Step 5: Commit**

```bash
git add src/services/lightspeed-reconciliation-sync-service.ts tests/unit/lightspeed-reconciliation-sync-service.test.ts
git commit -m "feat: classify missing Lightspeed category as sync conflict"
```

## Task 3: Add One-Run Conflict Overrides To Apply Requests

**Files:**
- Modify: `app/api/admin/lightspeed/sync/route.ts`
- Modify: `src/services/lightspeed-inbound-sync-service.ts`
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Test: `tests/unit/lightspeed-sync-api.test.ts`
- Test: `tests/unit/lightspeed-inbound-sync-service.test.ts`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] **Step 1: Write failing tests for override-aware apply**

Add this test to `tests/unit/lightspeed-inbound-sync-service.test.ts`:

```ts
  it("uses a sync-run category override when Lightspeed category is missing", async () => {
    getByLightspeedVariantIdMock.mockResolvedValue(null);
    getByExternalSkuMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "product-override-1" });
    createVariantMock.mockResolvedValue({ id: "variant-override-1" });

    const service = new LightspeedInboundSyncService({} as never);

    await service.applyProductPayload({
      tenantId: "tenant-1",
      payload: {
        id: "ls-override-1",
        name: "Override Product",
        sku: "OVR-001",
        variant_option_one_name: "Size",
        variant_option_one_value: "SMALL",
        inventory_Main_Outlet: 1,
      },
      topic: "product.update",
      remoteModifiedAt: "2026-06-17T15:00:00.000Z",
      categoryOverride: "clothing",
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "clothing",
        size_type: "clothing",
      }),
    );
  });
```

Add this API contract test to `tests/unit/lightspeed-sync-api.test.ts`:

```ts
  it("accepts apply import chunk requests with one-run category overrides", async () => {
    applyImportChunkMock.mockResolvedValue({
      importedCount: 1,
      failedCount: 0,
      failureDetails: [],
      resultItems: [],
    });

    const request = new Request("http://localhost/api/admin/lightspeed/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "apply_import_chunk",
        remoteProductIds: ["ls-override-1"],
        categoryOverrides: [
          { remoteProductId: "ls-override-1", category: "clothing" },
        ],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(applyImportChunkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryOverrides: [
          { remoteProductId: "ls-override-1", category: "clothing" },
        ],
      }),
    );
  });
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-inbound-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts --runInBand
```

Expected:

```txt
FAIL
Unknown property categoryOverride/categoryOverrides or override not applied
```

- [ ] **Step 3: Implement override plumbing**

Update `src/services/lightspeed-inbound-sync-service.ts` input type:

```ts
categoryOverride?: "sneakers" | "clothing" | "accessories" | "electronics";
```

Use:

```ts
const resolvedCategory = input.categoryOverride
  ? resolveWebsiteCategoryAndSizeType(input.categoryOverride)
  : resolveWebsiteCategoryAndSizeType(first.category);
```

Update `src/services/lightspeed-reconciliation-sync-service.ts` chunk method inputs:

```ts
categoryOverrides?: Array<{
  remoteProductId: string;
  category: "sneakers" | "clothing" | "accessories" | "electronics";
}>;
```

Build a lookup map once per apply call:

```ts
const categoryOverrideByRemoteProductId = new Map(
  (input.categoryOverrides ?? []).map((entry) => [entry.remoteProductId, entry.category] as const),
);
```

When calling inbound apply:

```ts
categoryOverride: categoryOverrideByRemoteProductId.get(remoteProductId),
```

Update `app/api/admin/lightspeed/sync/route.ts` zod schemas so apply chunk actions accept:

```ts
categoryOverrides: z
  .array(
    z.object({
      remoteProductId: z.string().uuid().or(z.string().min(1)),
      category: z.enum(["sneakers", "clothing", "accessories", "electronics"]),
    }),
  )
  .optional()
```

- [ ] **Step 4: Run focused tests to verify pass**

Run:

```bash
npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-inbound-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts --runInBand
```

Expected:

```txt
PASS
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/lightspeed/sync/route.ts src/services/lightspeed-inbound-sync-service.ts src/services/lightspeed-reconciliation-sync-service.ts tests/unit/lightspeed-inbound-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts
git commit -m "feat: support one-run category overrides during sync apply"
```

## Task 4: Add Conflict Resolution UI To The Sync Modal

**Files:**
- Modify: `app/admin/inventory/client.tsx`
- Test: `tests/unit/lightspeed-sync-api.test.ts`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] **Step 1: Write the failing client behavior tests or state assertions**

If there is no existing client test harness for this modal, add a focused reconciliation/API contract assertion instead of a broad UI test. At minimum, add a reconciliation apply test in `tests/unit/lightspeed-reconciliation-sync-service.test.ts` that proves a previously conflicting missing-category product can be imported when an override is supplied:

```ts
  it("applies an import for a missing-category conflict when a one-run category override is supplied", async () => {
    listProductsMock.mockResolvedValueOnce({
      products: [
        {
          id: "ls-conflict-resolved",
          name: "Resolved Conflict Product",
          updated_at: "2026-06-17T16:00:00.000Z",
          variants: [
            {
              id: "ls-conflict-resolved-variant",
              sku: "RSLV-001",
              variant_option_one_name: "Size",
              variant_option_one_value: "SMALL",
              inventory_Main_Outlet: 1,
            },
          ],
        },
      ],
      after: null,
      pageSize: 50,
      hasNextPage: false,
      nextAfter: null,
      totalProducts: 1,
    });
    getProductMock.mockResolvedValueOnce({
      id: "ls-conflict-resolved",
      name: "Resolved Conflict Product",
      updated_at: "2026-06-17T16:00:00.000Z",
      variants: [
        {
          id: "ls-conflict-resolved-variant",
          sku: "RSLV-001",
          variant_option_one_name: "Size",
          variant_option_one_value: "SMALL",
          inventory_Main_Outlet: 1,
        },
      ],
    });
    listForReconciliationMock.mockReset();
    listForReconciliationMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    applyProductPayloadMock.mockResolvedValueOnce({
      status: "applied",
      productId: "website-resolved-1",
    });

    const service = new LightspeedReconciliationSyncService({} as never);
    const result = await service.applyImportChunk({
      tenantId: "tenant-1",
      remoteProductIds: ["ls-conflict-resolved"],
      categoryOverrides: [
        { remoteProductId: "ls-conflict-resolved", category: "clothing" },
      ],
    });

    expect(result.importedCount).toBe(1);
  });
```

- [ ] **Step 2: Run the reconciliation tests to verify failure**

Run:

```bash
npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-reconciliation-sync-service.test.ts --runInBand
```

Expected:

```txt
FAIL
applyImportChunk does not accept categoryOverrides or does not pass override through
```

- [ ] **Step 3: Implement minimal client-side conflict resolution state and payloads**

In `app/admin/inventory/client.tsx`:

1. Extend conflict typing to support:

```ts
conflictReason?: "multiple_candidates" | "missing_category";
resolutionOptions?: {
  categories: Array<"sneakers" | "clothing" | "accessories" | "electronics">;
};
```

2. Add state:

```ts
const [syncConflictResolutions, setSyncConflictResolutions] = useState<
  Record<string, "sneakers" | "clothing" | "accessories" | "electronics">
>({});
```

3. Reset that state in:

```ts
closeSyncDialog();
loadSyncPreview();
```

4. In the preview conflict column, for `missing_category`, render:

```tsx
<select
  value={syncConflictResolutions[item.remoteProductId] ?? ""}
  onChange={(event) =>
    setSyncConflictResolutions((prev) => ({
      ...prev,
      [item.remoteProductId]: event.target.value as
        | "sneakers"
        | "clothing"
        | "accessories"
        | "electronics",
    }))
  }
>
  <option value="">Select category</option>
  {item.resolutionOptions?.categories.map((category) => (
    <option key={category} value={category}>
      {category}
    </option>
  ))}
</select>
```

5. Derive unresolved missing-category conflicts:

```ts
const unresolvedMissingCategoryConflicts =
  syncPreview?.conflicts.filter(
    (item) =>
      item.conflictReason === "missing_category" &&
      !syncConflictResolutions[item.remoteProductId],
  ) ?? [];
```

6. Block apply when any remain unresolved:

```ts
if (unresolvedMissingCategoryConflicts.length > 0) {
  showToast("Resolve all missing-category conflicts before applying sync.", "error");
  return;
}
```

7. Build override payload once:

```ts
const categoryOverrides = Object.entries(syncConflictResolutions).map(
  ([remoteProductId, category]) => ({ remoteProductId, category }),
);
```

8. Include `categoryOverrides` in all apply chunk POST bodies so the server can use them where relevant.

- [ ] **Step 4: Run focused tests and then typecheck**

Run:

```bash
npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-reconciliation-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts --runInBand
npm run typecheck
```

Expected:

```txt
PASS
```

- [ ] **Step 5: Run lint on touched files**

Run:

```bash
npx eslint app/admin/inventory/client.tsx src/services/lightspeed-category-resolution.ts src/services/lightspeed-inbound-sync-service.ts src/services/lightspeed-reconciliation-sync-service.ts tests/unit/lightspeed-inbound-sync-service.test.ts tests/unit/lightspeed-reconciliation-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts
```

Expected:

```txt
0 problems
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/inventory/client.tsx src/services/lightspeed-category-resolution.ts src/services/lightspeed-inbound-sync-service.ts src/services/lightspeed-reconciliation-sync-service.ts app/api/admin/lightspeed/sync/route.ts tests/unit/lightspeed-inbound-sync-service.test.ts tests/unit/lightspeed-reconciliation-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts
git commit -m "feat: add one-run resolution for missing Lightspeed category conflicts"
```

## Self-Review

### Spec coverage

- Category-first `size_type`: covered by Task 1
- Missing/unknown category as conflict: covered by Task 2
- One-run conflict resolution: covered by Task 3 and Task 4
- No persistent override storage: enforced by Task 4 state reset and Task 3 request-only plumbing
- Existing misclassified products repairable via sync: achieved by Task 1 + Task 2 reconciliation behavior

### Placeholder scan

- No `TODO`/`TBD`
- Every code-changing step contains explicit code or structure
- Every verification step has a concrete command and expected outcome

### Type consistency

- Override category type is kept as `"sneakers" | "clothing" | "accessories" | "electronics"` throughout
- Conflict reason name is kept as `missing_category`
- Shared helper name is kept as `resolveWebsiteCategoryAndSizeType`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-17-lightspeed-size-type-conflict-resolution-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
