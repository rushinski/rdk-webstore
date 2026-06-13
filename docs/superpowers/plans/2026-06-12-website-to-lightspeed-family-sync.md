# Website To Lightspeed Family Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make website-originated Lightspeed sync create proper product families with exact SKUs and full variant metadata, while fixing `deleted_product_recovery` permissions so website deletes can persist recovery snapshots before deleting remote products.

**Architecture:** Keep inbound and reconciliation behavior unchanged. Introduce an explicit website-outbound family payload path inside `LightspeedProductSyncService` that always creates a Lightspeed family with `Condition` and `Size` variants, preserves website SKUs 1:1, and includes pricing, cost, brand, category, description, and inventory. In parallel, correct the `deleted_product_recovery` RLS policy so server-authenticated admin deletes can insert recovery rows without weakening the fail-closed delete behavior.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, PostgreSQL RLS, Jest

---

## File Structure

- Modify `src/lib/lightspeed/types.ts`
  - Expand outbound payload types so family and variant writes can carry brand, category, unit cost, inventory, and multiple variant definitions.
- Modify `src/services/lightspeed-product-sync-service.ts`
  - Replace the current mixed standard/family create behavior with a dedicated website-outbound family payload path.
  - Preserve the duplicate-name retry behavior for used products.
  - Stop deriving outbound SKUs when a website SKU already exists.
- Modify `tests/unit/lightspeed-product-sync-service.test.ts`
  - Add precise coverage for exact SKU preservation, one-variant family creation, `Condition` and `Size` definitions, brand/category/cost/inventory propagation, and delete fail-closed behavior when recovery persistence fails.
- Modify `supabase/migrations/20260612190000_deleted_product_recovery.sql`
  - Correct the RLS policy so authenticated admin server requests can insert rows for the tenant they administer.
- Create `supabase/migrations/20260612210000_deleted_product_recovery_rls_fix.sql`
  - If the existing migration should remain immutable in practice, write a follow-up migration that drops and recreates the policy instead of editing historical migration text.
- Create `tests/unit/deleted-product-recovery-repo.test.ts`
  - Add repository-level coverage for the insert call shape and error propagation, so the RLS-sensitive path remains tested from the application side.

### Task 1: Add Failing Tests For Website-Outbound Family Payload Behavior

**Files:**
- Modify: `tests/unit/lightspeed-product-sync-service.test.ts`

- [ ] **Step 1: Add a failing test that preserves the exact website SKU**

Add this test:

```ts
it("uses the exact website sku instead of deriving a Lightspeed sku", async () => {
  getConnectionByTenantMock.mockResolvedValue({
    syncEnabled: true,
    domainPrefix: "demo-store",
    accessToken: "token",
  });

  getByIdMock.mockResolvedValue({
    id: "product-1",
    name: "Test Product",
    category: "accessories",
    condition: "new",
    brand: "Other",
    model: "Test Product",
    description: "desc",
    is_active: true,
    variants: [
      {
        id: "variant-1",
        sku: "358845370",
        size_label: "4Y",
        sale_price_cents: 20000,
        unit_cost_cents: 10000,
        stock: 2,
      },
    ],
  });

  getByVariantIdMock.mockResolvedValue(null);
  getByExternalSkuMock.mockResolvedValue(null);
  listVariantAttributesMock.mockResolvedValue([
    { id: "attr-condition-1", name: "Condition" },
    { id: "attr-size-1", name: "Size" },
  ]);
  createProductMock.mockResolvedValue({
    data: ["ls-family-1", "ls-child-1"],
  });

  const service = new LightspeedProductSyncService({} as never);

  await service.syncWebsiteProduct("product-1", {
    tenantId: "tenant-1",
    source: "create",
  });

  const payload = createProductMock.mock.calls[0]?.[0];
  expect(payload.variants?.[0]?.sku).toBe("358845370");
  expect(payload.variants?.[0]?.product_codes).toEqual([
    { code: "358845370", type: "CUSTOM" },
  ]);
});
```

- [ ] **Step 2: Add a failing test that a single website variant still creates a family with `Condition` and `Size`**

Add this test:

```ts
it("creates a one-variant Lightspeed family with Condition and Size definitions", async () => {
  getConnectionByTenantMock.mockResolvedValue({
    syncEnabled: true,
    domainPrefix: "demo-store",
    accessToken: "token",
  });

  getByIdMock.mockResolvedValue({
    id: "product-1",
    name: "Used Jordan",
    category: "sneakers",
    condition: "used",
    brand: "Jordan",
    model: "Jordan 3",
    description: "desc",
    is_active: true,
    variants: [
      {
        id: "variant-1",
        sku: "358845370",
        size_label: "4Y",
        sale_price_cents: 20000,
        unit_cost_cents: 10000,
        stock: 1,
      },
    ],
  });

  getByVariantIdMock.mockResolvedValue(null);
  getByExternalSkuMock.mockResolvedValue(null);
  listVariantAttributesMock.mockResolvedValue([
    { id: "attr-condition-1", name: "Condition" },
    { id: "attr-size-1", name: "Size" },
  ]);
  createProductMock.mockResolvedValue({
    data: ["ls-family-1", "ls-child-1"],
  });

  const service = new LightspeedProductSyncService({} as never);

  await service.syncWebsiteProduct("product-1", {
    tenantId: "tenant-1",
    source: "create",
  });

  const payload = createProductMock.mock.calls[0]?.[0];
  expect(payload.variants).toHaveLength(1);
  expect(payload.variants?.[0]?.variant_definitions).toEqual(
    expect.arrayContaining([
      { attribute_id: "attr-condition-1", value: "Preowned" },
      { attribute_id: "attr-size-1", value: "4Y" },
    ]),
  );
});
```

- [ ] **Step 3: Add a failing test for brand, category, unit cost, retail price, and inventory**

Add this test:

```ts
it("includes brand, category, description, retail price, unit cost, and inventory in create payloads", async () => {
  getConnectionByTenantMock.mockResolvedValue({
    syncEnabled: true,
    domainPrefix: "demo-store",
    accessToken: "token",
  });

  getByIdMock.mockResolvedValue({
    id: "product-1",
    name: "Test Product",
    category: "accessories",
    condition: "new",
    brand: "Other",
    model: "Test Product",
    description: "desc",
    is_active: true,
    variants: [
      {
        id: "variant-1",
        sku: "358845370",
        size_label: "4Y",
        sale_price_cents: 20000,
        unit_cost_cents: 10000,
        stock: 2,
      },
    ],
  });

  getByVariantIdMock.mockResolvedValue(null);
  getByExternalSkuMock.mockResolvedValue(null);
  listVariantAttributesMock.mockResolvedValue([
    { id: "attr-condition-1", name: "Condition" },
    { id: "attr-size-1", name: "Size" },
  ]);
  createProductMock.mockResolvedValue({
    data: ["ls-family-1", "ls-child-1"],
  });

  const service = new LightspeedProductSyncService({} as never);

  await service.syncWebsiteProduct("product-1", {
    tenantId: "tenant-1",
    source: "create",
  });

  const payload = createProductMock.mock.calls[0]?.[0];
  expect(payload).toEqual(
    expect.objectContaining({
      name: "Test Product",
      description: "desc",
      brand_name: "Other",
      product_category: "accessories",
    }),
  );
  expect(payload.variants?.[0]).toEqual(
    expect.objectContaining({
      retail_price: 200,
      supply_price: 100,
      inventory: [{ current_amount: 2 }],
    }),
  );
});
```

- [ ] **Step 4: Run the sync service tests to verify the new tests fail**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-product-sync-service.test.ts`

Expected: FAIL because the current payload still derives SKUs, omits `Condition`, omits inventory and cost on create, and still creates a standard product for a single website variant.

- [ ] **Step 5: Commit the failing tests**

```bash
git add tests/unit/lightspeed-product-sync-service.test.ts
git commit -m "test: cover website lightspeed family payload requirements"
```

### Task 2: Implement The Website-Outbound Family Payload

**Files:**
- Modify: `src/lib/lightspeed/types.ts`
- Modify: `src/services/lightspeed-product-sync-service.ts`

- [ ] **Step 1: Expand the outbound Lightspeed payload types**

Update the payload types to allow the fields the tests demand.

Target shape in `src/lib/lightspeed/types.ts`:

```ts
export type LightspeedProductInventoryPayload = {
  current_amount: number;
  outlet_id?: string;
};

export type LightspeedProductVariantPayload = {
  name: string;
  sku: string;
  product_codes: LightspeedProductCode[];
  retail_price: number;
  supply_price?: number;
  is_active: boolean;
  inventory?: LightspeedProductInventoryPayload[];
  variant_definitions: LightspeedVariantDefinition[];
};

export type LightspeedCreateProductPayload = {
  name: string;
  description?: string;
  brand_name?: string;
  product_category?: string;
  is_active: boolean;
  variants?: LightspeedProductVariantPayload[];
};
```

- [ ] **Step 2: Add helpers for website-outbound attribute ids and condition labels**

Add focused helpers in `src/services/lightspeed-product-sync-service.ts` like:

```ts
private async ensureVariantAttributeIds(client: LightspeedClient) {
  const [conditionAttributeId, sizeAttributeId] = await Promise.all([
    this.ensureVariantAttributeId(client, "Condition"),
    this.ensureVariantAttributeId(client, "Size"),
  ]);

  return { conditionAttributeId, sizeAttributeId };
}

private toLightspeedConditionVariantValue(condition: "new" | "used") {
  return condition === "used" ? "Preowned" : "New";
}
```

- [ ] **Step 3: Stop deriving SKUs when a website SKU already exists**

Replace the current `externalSku` resolution in `syncWebsiteProduct` with logic shaped like:

```ts
const externalSku =
  existingLink?.external_sku ??
  variant.sku?.trim() ??
  this.buildVariantExternalSku(variant.sku, {
    condition: product.condition,
    brand: product.brand,
    model: product.model ?? product.name,
    sizeLabel: variant.size_label,
    variantIndex: index,
  });
```

If `variant.sku` is always non-empty in practice, preserve the fallback anyway so the code remains defensive without rewriting valid website SKUs.

- [ ] **Step 4: Replace standard-product create with a family-only website payload builder**

Refactor `buildCreatePayload(...)` into a family builder that always returns `variants`, even for one variant.

Target shape:

```ts
private buildCreatePayload(
  product: WebsiteProduct,
  resolvedVariants: ResolvedVariant[],
  attributeIds: { conditionAttributeId: string; sizeAttributeId: string },
  nameOverride?: string | null,
): LightspeedCreateProductPayload {
  const titleDisplay = nameOverride?.trim() || product.name.trim();

  return {
    name: titleDisplay,
    description: product.description ?? undefined,
    brand_name: product.brand?.trim() || undefined,
    product_category: product.category?.trim() || undefined,
    is_active: product.is_active,
    variants: resolvedVariants.map((entry) => ({
      name: titleDisplay,
      sku: entry.externalSku,
      product_codes: [{ code: entry.externalSku, type: "CUSTOM" }],
      retail_price: entry.variant.sale_price_cents / 100,
      supply_price:
        entry.variant.unit_cost_cents !== undefined
          ? entry.variant.unit_cost_cents / 100
          : undefined,
      is_active: product.is_active,
      inventory: [{ current_amount: Math.max(0, entry.variant.stock ?? 0) }],
      variant_definitions: [
        {
          attribute_id: attributeIds.conditionAttributeId,
          value: this.toLightspeedConditionVariantValue(product.condition),
        },
        {
          attribute_id: attributeIds.sizeAttributeId,
          value: entry.variant.size_label,
        },
      ],
    })),
  };
}
```

- [ ] **Step 5: Update the resolved variant type to carry unit cost and stock**

Replace the current narrow `ResolvedVariant` with:

```ts
type ResolvedVariant = {
  externalSku: string;
  variant: {
    size_label: string;
    sale_price_cents: number;
    unit_cost_cents?: number;
    stock?: number;
  };
};
```

- [ ] **Step 6: Switch create flow to use both `Condition` and `Size` attributes**

In `syncWebsiteProduct`, replace:

```ts
const sizeAttributeId =
  resolvedVariants.length > 1
    ? await this.ensureVariantAttributeId(client, "Size")
    : null;
```

With:

```ts
const attributeIds = await this.ensureVariantAttributeIds(client);
const payload = this.buildCreatePayload(product, resolvedVariants, attributeIds);
```

And update the duplicate-name retry helper signature to take `attributeIds` instead of a nullable `sizeAttributeId`.

- [ ] **Step 7: Run the sync tests to verify the new family payload passes**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-product-sync-service.test.ts`

Expected: PASS

- [ ] **Step 8: Commit the family payload implementation**

```bash
git add src/lib/lightspeed/types.ts src/services/lightspeed-product-sync-service.ts tests/unit/lightspeed-product-sync-service.test.ts
git commit -m "feat: create website products as lightspeed families"
```

### Task 3: Add Failing Tests For Delete Recovery Fail-Closed Behavior

**Files:**
- Modify: `tests/unit/lightspeed-product-sync-service.test.ts`
- Create: `tests/unit/deleted-product-recovery-repo.test.ts`

- [ ] **Step 1: Add a failing service test that aborts delete when recovery persistence fails**

Add this test:

```ts
it("does not delete the remote product when recovery persistence fails", async () => {
  getConnectionByTenantMock.mockResolvedValue({
    syncEnabled: true,
    domainPrefix: "demo-store",
    accessToken: "token",
  });
  getByIdMock.mockResolvedValue({
    id: "product-1",
    tenant_id: "tenant-1",
    name: "Jordan 4 Delta",
    brand: "Jordan",
    model: "Delta",
    category: "sneakers",
    condition: "new",
    size_type: "shoe",
    description: "desc",
    is_active: true,
    is_out_of_stock: false,
    archived_at: null,
    created_at: "2026-06-01T00:00:00.000Z",
    product_created_at: "2026-06-01T00:00:00.000Z",
    product_updated_at: "2026-06-05T20:30:00.000Z",
    variants: [
      {
        id: "variant-1",
        sku: "SKU-1",
        size_label: "10",
        sale_price_cents: 20000,
        unit_cost_cents: 10000,
        stock: 1,
        sort_order: 0,
      },
    ],
    images: [],
    tags: [],
  });
  listByProductIdMock.mockResolvedValue([
    {
      id: "link-1",
      product_id: "product-1",
      variant_id: "variant-1",
      lightspeed_family_id: "ls-family-1",
      lightspeed_product_id: "ls-family-1",
    },
  ]);
  getProductMock.mockResolvedValue({
    id: "ls-family-1",
    name: "Jordan 4 Delta",
    sku: "SKU-1",
  });
  recordDeletionMock.mockRejectedValueOnce(
    Object.assign(new Error("new row violates row-level security policy"), {
      code: "42501",
    }),
  );

  const service = new LightspeedProductSyncService({} as never);

  await expect(
    service.deleteWebsiteProduct({
      tenantId: "tenant-1",
      productId: "product-1",
    }),
  ).rejects.toThrow("new row violates row-level security policy");

  expect(deleteProductMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Add a repository test that surfaces Supabase insert errors**

Create `tests/unit/deleted-product-recovery-repo.test.ts` with:

```ts
const insertMock = jest.fn();
const selectMock = jest.fn();
const singleMock = jest.fn();
const fromMock = jest.fn();

jest.mock("@/lib/supabase/server", () => ({}));

import { DeletedProductRecoveryRepository } from "@/repositories/deleted-product-recovery-repo";

describe("DeletedProductRecoveryRepository", () => {
  beforeEach(() => {
    insertMock.mockReset();
    selectMock.mockReset();
    singleMock.mockReset();
    fromMock.mockReset();
  });

  it("rethrows insert errors from deleted_product_recovery", async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: Object.assign(new Error("new row violates row-level security policy"), {
        code: "42501",
      }),
    });
    selectMock.mockReturnValue({ single: singleMock });
    insertMock.mockReturnValue({ select: selectMock });
    fromMock.mockReturnValue({ insert: insertMock });

    const repo = new DeletedProductRecoveryRepository({
      from: fromMock,
    } as never);

    await expect(
      repo.recordDeletion({
        tenantId: "tenant-1",
        productId: "product-1",
        localProductSnapshot: {},
        lightspeedProductSnapshots: [],
        links: [],
      }),
    ).rejects.toThrow("new row violates row-level security policy");
  });
});
```

- [ ] **Step 3: Run the delete-recovery tests to verify current behavior**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-product-sync-service.test.ts tests/unit/deleted-product-recovery-repo.test.ts`

Expected: PASS for fail-closed behavior, because the service already stops on repository error. The repository test should also pass and pin error propagation.

- [ ] **Step 4: Commit the delete fail-closed tests**

```bash
git add tests/unit/lightspeed-product-sync-service.test.ts tests/unit/deleted-product-recovery-repo.test.ts
git commit -m "test: cover deleted product recovery failures"
```

### Task 4: Fix Deleted Product Recovery RLS For Admin Deletes

**Files:**
- Create: `supabase/migrations/20260612210000_deleted_product_recovery_rls_fix.sql`
- Modify: `src/repositories/deleted-product-recovery-repo.ts`

- [ ] **Step 1: Write the follow-up migration that replaces the current policy**

Create the migration with:

```sql
drop policy if exists "Admins can manage deleted product recovery"
  on public.deleted_product_recovery;

create policy "Admins can manage deleted product recovery"
  on public.deleted_product_recovery
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
        and profiles.tenant_id = deleted_product_recovery.tenant_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
        and profiles.tenant_id = tenant_id
    )
  );
```

- [ ] **Step 2: Add a repository-level comment or small guard if needed for future debugging**

If the repository needs a clarifying comment, keep it minimal:

```ts
// Deletes fail closed: if recovery capture cannot be persisted, the caller must stop before remote delete.
if (error) {
  throw error;
}
```

- [ ] **Step 3: Run the repository and sync tests again**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/deleted-product-recovery-repo.test.ts tests/unit/lightspeed-product-sync-service.test.ts`

Expected: PASS

- [ ] **Step 4: Commit the RLS fix**

```bash
git add supabase/migrations/20260612210000_deleted_product_recovery_rls_fix.sql src/repositories/deleted-product-recovery-repo.ts
git commit -m "fix: allow admin recovery snapshots before lightspeed delete"
```

### Task 5: Run Full Targeted Verification

**Files:**
- Modify: none
- Test: `tests/unit/lightspeed-product-sync-service.test.ts`
- Test: `tests/unit/deleted-product-recovery-repo.test.ts`
- Test: `tests/unit/lightspeed-client.test.ts`
- Test: `tests/unit/lightspeed-mapping-service.test.ts`
- Test: `tests/unit/product-service.test.ts`

- [ ] **Step 1: Run the targeted suite covering all touched paths**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-product-sync-service.test.ts tests/unit/deleted-product-recovery-repo.test.ts tests/unit/lightspeed-client.test.ts tests/unit/lightspeed-mapping-service.test.ts tests/unit/product-service.test.ts`

Expected: PASS

- [ ] **Step 2: Run lint on all touched files**

Run: `npx eslint src/lib/lightspeed/types.ts src/services/lightspeed-product-sync-service.ts src/repositories/deleted-product-recovery-repo.ts tests/unit/lightspeed-product-sync-service.test.ts tests/unit/deleted-product-recovery-repo.test.ts`

Expected: no lint errors

- [ ] **Step 3: Commit any final formatting-only adjustments**

```bash
git add src/lib/lightspeed/types.ts src/services/lightspeed-product-sync-service.ts src/repositories/deleted-product-recovery-repo.ts tests/unit/lightspeed-product-sync-service.test.ts tests/unit/deleted-product-recovery-repo.test.ts supabase/migrations/20260612210000_deleted_product_recovery_rls_fix.sql
git commit -m "chore: finalize lightspeed family sync verification"
```
