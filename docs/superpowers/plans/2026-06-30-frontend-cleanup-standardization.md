# Frontend Cleanup And Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize the current frontend codebase so route structure, component placement, naming, imports, and removed-feature cleanup follow one coherent pattern without changing user-facing behavior.

**Architecture:** Treat `app/` as route entrypoints and server composition, keep reusable renderable UI in `src/components/<domain>`, and move route-specific interactive screens into focused client or section components instead of giant page files. Cleanup proceeds in layers: codify standards, purge removed-feature residue, normalize route structure, split the worst oversized modules, then remove transitional shims and dead files.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Jest, ESLint

---

## File Structure Map

### Standards and architecture guardrails

- Create: `docs/frontend-standards.md`
- Create: `tests/unit/frontend-structure-standards.test.ts`
- Modify: `app/admin/shipping/page.tsx`
- Modify: `app/store/page.tsx`
- Modify: `src/components/shell/ClientShell.tsx`
- Modify: `src/components/search/SearchOverlay.tsx`
- Modify: `src/components/cart/CartDrawer.tsx`
- Modify: `src/components/storefront/catalog/CatalogProductGrid.tsx`
- Modify: `src/components/storefront/catalog/CatalogProductCard.tsx`

### Removed-feature semantic purge

- Modify: `src/components/checkout/CheckoutForm.tsx`
- Modify: `src/components/checkout/CheckoutStart.tsx`
- Modify: `app/admin/inventory/client.tsx`
- Modify: `src/config/env.ts`
- Modify: `src/lib/validation/product.ts`
- Test: `tests/unit/checkout-form-branding.test.tsx`

### Admin route structure normalization

- Create: `src/components/admin/shipping/AdminShippingScreen.tsx`
- Create: `src/components/admin/transactions/AdminTransactionDetailScreen.tsx`
- Modify: `app/admin/shipping/page.tsx`
- Modify: `app/admin/transactions/[orderId]/page.tsx`
- Modify: `app/admin/catalog/page.tsx`
- Modify: `app/admin/featured-items/page.tsx`
- Modify: `app/admin/featured-items/client.tsx`

### Storefront structure normalization

- Create: `src/components/storefront/catalog/StorefrontFilterPanel.tsx`
- Create: `src/components/storefront/catalog/StorefrontControls.tsx`
- Create: `src/components/storefront/catalog/StorefrontProductGrid.tsx`
- Modify: `app/store/page.tsx`
- Modify: `src/components/store/FilterPanel.tsx`
- Modify: `src/components/store/StoreControls.tsx`
- Modify: `src/components/store/ProductGrid.tsx`

### Oversized component decomposition

- Create: `src/components/inventory/product-form/ProductFormMediaSection.tsx`
- Create: `src/components/inventory/product-form/ProductFormDetailsSection.tsx`
- Create: `src/components/inventory/product-form/ProductFormVariantsSection.tsx`
- Create: `src/components/checkout/CheckoutPolicyPanel.tsx`
- Create: `src/components/checkout/CheckoutPaymentSection.tsx`
- Create: `src/components/admin/inventory/InventoryToolbar.tsx`
- Create: `src/components/admin/inventory/InventoryTable.tsx`
- Modify: `src/components/inventory/ProductForm.tsx`
- Modify: `src/components/checkout/CheckoutForm.tsx`
- Modify: `app/admin/inventory/client.tsx`

### Verification and dead-file cleanup

- Modify: `tests/unit/admin-transactions-detail-branding.test.tsx`
- Modify: `tests/unit/admin-shipping-settings-branding.test.tsx`
- Modify: `tests/unit/admin-profile-branding.test.tsx`
- Create: `tests/unit/storefront-structure-regression.test.tsx`

---

### Task 1: Codify Frontend Structure Standards

**Files:**
- Create: `docs/frontend-standards.md`
- Create: `tests/unit/frontend-structure-standards.test.ts`
- Modify: `app/admin/shipping/page.tsx`
- Modify: `app/store/page.tsx`
- Modify: `src/components/search/SearchOverlay.tsx`
- Modify: `src/components/cart/CartDrawer.tsx`
- Modify: `src/components/storefront/catalog/CatalogProductGrid.tsx`
- Modify: `src/components/storefront/catalog/CatalogProductCard.tsx`

- [ ] **Step 1: Write the failing structure standards test**

```ts
import fs from "node:fs";
import path from "node:path";

describe("frontend structure standards", () => {
  it("avoids src-crossing relative imports from app routes", () => {
    const shippingPage = fs.readFileSync(
      path.join(process.cwd(), "app/admin/shipping/page.tsx"),
      "utf8",
    );

    expect(shippingPage).not.toMatch(/\.\.\/\.\.\/\.\.\/src\//);
  });

  it("keeps storefront wrappers from re-exporting legacy store components", () => {
    const catalogGrid = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/storefront/catalog/CatalogProductGrid.tsx",
      ),
      "utf8",
    );

    expect(catalogGrid).not.toContain('export { ProductGrid as CatalogProductGrid }');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runInBand tests/unit/frontend-structure-standards.test.ts`
Expected: FAIL because `app/admin/shipping/page.tsx` still contains `../../../src/...` imports and storefront wrappers still re-export legacy files.

- [ ] **Step 3: Write the standards document**

```md
# Frontend Standards

## Placement

- `app/` contains route entrypoints, server loaders, route layouts, and route-only wrappers.
- `src/components/<domain>` contains renderable UI components.
- `src/components/storefront/*` is the canonical storefront component tree.
- `src/components/admin/*` is the canonical admin component tree.

## Imports

- Use `@/` imports for application code.
- Do not import from `../../../src/...` out of `app/`.

## Route shape

- Prefer server `page.tsx` by default.
- Move heavy interactive UI into `client.tsx` or focused screen components.
- Keep page files thin and declarative.
```

- [ ] **Step 4: Replace the root-crossing shipping imports with alias imports**

```ts
import { OriginModal } from "@/components/admin/shipping/OriginModal";
import type {
  ShippingAddress,
  ShippingDefault,
  ShippingOrigin,
  TabKey,
} from "@/types/domain/shipping";
```

- [ ] **Step 5: Convert storefront re-export wrappers into canonical imports at the route**

```tsx
import { CatalogFilterBar } from "@/components/storefront/catalog/CatalogFilterBar";
import { CatalogToolbar } from "@/components/storefront/catalog/CatalogToolbar";
import { StorefrontFilterPanel } from "@/components/storefront/catalog/StorefrontFilterPanel";
import { StorefrontProductGrid } from "@/components/storefront/catalog/StorefrontProductGrid";
import { StorefrontControls } from "@/components/storefront/catalog/StorefrontControls";
```

- [ ] **Step 6: Remove legacy wrapper-only exports once route imports are updated**

Run: `rg -n "CatalogProductGrid|CatalogProductCard|SearchOverlay|CartDrawer" app src -g "*.ts" -g "*.tsx"`
Expected: only canonical component usages remain, or remaining aliases are clearly intentional.

- [ ] **Step 7: Run the standards test and lint**

Run: `npx jest --runInBand tests/unit/frontend-structure-standards.test.ts`
Expected: PASS

Run: `npx eslint app/admin/shipping/page.tsx app/store/page.tsx tests/unit/frontend-structure-standards.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add docs/frontend-standards.md tests/unit/frontend-structure-standards.test.ts app/admin/shipping/page.tsx app/store/page.tsx src/components/search/SearchOverlay.tsx src/components/cart/CartDrawer.tsx src/components/storefront/catalog/CatalogProductGrid.tsx src/components/storefront/catalog/CatalogProductCard.tsx
git commit -m "refactor: codify frontend structure standards"
```

### Task 2: Purge Removed-Feature Residue

**Files:**
- Modify: `src/components/checkout/CheckoutForm.tsx`
- Modify: `src/components/checkout/CheckoutStart.tsx`
- Modify: `app/admin/inventory/client.tsx`
- Modify: `src/config/env.ts`
- Modify: `src/lib/validation/product.ts`
- Modify: `tests/unit/checkout-form-branding.test.tsx`

- [ ] **Step 1: Write a failing removed-feature regression test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";

import { CheckoutForm } from "@/components/checkout/CheckoutForm";

describe("checkout removed-feature cleanup", () => {
  it("does not mention in-app chat in pickup policy copy", () => {
    const html = renderToStaticMarkup(
      <CheckoutForm
        orderId="order-1"
        tokenizationKey={null}
        items={[]}
        total={0}
        displayTotal={0}
        fulfillment="pickup"
        shippingAddress={null}
        onShippingAddressChange={() => {}}
        onFulfillmentChange={() => {}}
      />,
    );

    expect(html).not.toContain("pickup chat");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runInBand tests/unit/checkout-form-branding.test.tsx`
Expected: FAIL because pickup policy copy still references chat behavior.

- [ ] **Step 3: Remove dead chat-specific checkout props and copy**

```ts
interface CheckoutFormProps {
  orderId: string;
  tokenizationKey: string | null;
  items: CartItem[];
  total: number;
  displayTotal: number;
  fulfillment: "ship" | "pickup";
  shippingAddress: ShippingAddress | null;
  onShippingAddressChange: (address: ShippingAddress | null) => void;
  onFulfillmentChange: (fulfillment: "ship" | "pickup") => void;
  isUpdatingFulfillment?: boolean;
  guestEmail?: string | null;
  onGuestEmailChange?: (email: string) => void;
  isGuestCheckout?: boolean;
}
```

- [ ] **Step 4: Remove stale Lightspeed references from admin inventory UX and env schema**

```ts
description={
  pendingArchive?.mode === "selected"
    ? `This will move ${pendingArchive.count ?? selectedCount} products to the Archived tab. This only changes storefront visibility.`
    : pendingArchive?.label
      ? `This will move ${pendingArchive.label} to the Archived tab. This only changes storefront visibility.`
      : undefined
}
```

```ts
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  // removed: LIGHTSPEED_* variables
});
```

- [ ] **Step 5: Remove migration comments that preserve deleted concepts**

Run: `rg -n "Lightspeed|chat" src/components/checkout src/config/env.ts app/admin/inventory/client.tsx src/lib/validation/product.ts`
Expected: only intentional historical references remain, or no hits in the cleaned frontend files.

- [ ] **Step 6: Run focused verification**

Run: `npx jest --runInBand tests/unit/checkout-form-branding.test.tsx`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/checkout/CheckoutForm.tsx src/components/checkout/CheckoutStart.tsx app/admin/inventory/client.tsx src/config/env.ts src/lib/validation/product.ts tests/unit/checkout-form-branding.test.tsx
git commit -m "refactor: remove stale chat and lightspeed frontend residue"
```

### Task 3: Normalize Admin Route Composition

**Files:**
- Create: `src/components/admin/shipping/AdminShippingScreen.tsx`
- Create: `src/components/admin/transactions/AdminTransactionDetailScreen.tsx`
- Modify: `app/admin/shipping/page.tsx`
- Modify: `app/admin/transactions/[orderId]/page.tsx`
- Modify: `app/admin/catalog/page.tsx`
- Modify: `app/admin/featured-items/page.tsx`
- Modify: `app/admin/featured-items/client.tsx`

- [ ] **Step 1: Write a failing characterization test for thin route composition**

```ts
import fs from "node:fs";
import path from "node:path";

describe("admin route composition", () => {
  it("keeps featured items page as a thin route entrypoint", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/admin/featured-items/page.tsx"),
      "utf8",
    );

    expect(source).toContain("FeaturedItemsManager");
    expect(source.split("\n").length).toBeLessThan(20);
  });
});
```

- [ ] **Step 2: Extract shipping and transactions screen modules**

```tsx
// src/components/admin/shipping/AdminShippingScreen.tsx
export function AdminShippingScreen() {
  return (
    <>
      {/* existing interactive shipping UI moved here unchanged */}
    </>
  );
}
```

```tsx
// app/admin/shipping/page.tsx
"use client";

import { AdminShippingScreen } from "@/components/admin/shipping/AdminShippingScreen";

export default function AdminShippingPage() {
  return <AdminShippingScreen />;
}
```

- [ ] **Step 3: Move catalog feature subcomponents out of `app/` if they are reusable screen sections**

```txt
src/components/admin/catalog/AliasesTab.tsx
src/components/admin/catalog/BrandsTab.tsx
src/components/admin/catalog/CandidatesTab.tsx
src/components/admin/catalog/CatalogToolbar.tsx
src/components/admin/catalog/TagModals.tsx
```

- [ ] **Step 4: Keep route entrypoints declarative**

Run: `Get-Content app/admin/shipping/page.tsx`
Expected: route file only imports its screen and exports a small wrapper.

Run: `Get-Content app/admin/transactions/[orderId]/page.tsx`
Expected: file is materially smaller or clearly delegated to extracted sections.

- [ ] **Step 5: Verify admin route structure**

Run: `npx eslint app/admin/shipping/page.tsx app/admin/transactions/[orderId]/page.tsx app/admin/catalog/page.tsx app/admin/featured-items/page.tsx`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/admin/shipping/page.tsx app/admin/transactions/[orderId]/page.tsx app/admin/catalog/page.tsx app/admin/featured-items/page.tsx app/admin/featured-items/client.tsx src/components/admin/shipping/AdminShippingScreen.tsx src/components/admin/transactions/AdminTransactionDetailScreen.tsx src/components/admin/catalog
git commit -m "refactor: normalize admin route composition"
```

### Task 4: Normalize Storefront Component Structure

**Files:**
- Create: `src/components/storefront/catalog/StorefrontFilterPanel.tsx`
- Create: `src/components/storefront/catalog/StorefrontControls.tsx`
- Create: `src/components/storefront/catalog/StorefrontProductGrid.tsx`
- Modify: `app/store/page.tsx`
- Modify: `src/components/store/FilterPanel.tsx`
- Modify: `src/components/store/StoreControls.tsx`
- Modify: `src/components/store/ProductGrid.tsx`
- Create: `tests/unit/storefront-structure-regression.test.tsx`

- [ ] **Step 1: Write the failing storefront structure regression test**

```ts
import fs from "node:fs";
import path from "node:path";

describe("storefront route structure", () => {
  it("uses the storefront catalog component tree from the store route", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/store/page.tsx"), "utf8");

    expect(source).toContain("@/components/storefront/catalog/StorefrontFilterPanel");
    expect(source).toContain("@/components/storefront/catalog/StorefrontControls");
    expect(source).toContain("@/components/storefront/catalog/StorefrontProductGrid");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runInBand tests/unit/storefront-structure-regression.test.tsx`
Expected: FAIL because the store route still imports `src/components/store/*`.

- [ ] **Step 3: Move the current implementations to the storefront tree or create canonical wrappers**

```tsx
export { FilterPanel as StorefrontFilterPanel } from "@/components/store/FilterPanel";
export { StoreControls as StorefrontControls } from "@/components/store/StoreControls";
export { ProductGrid as StorefrontProductGrid } from "@/components/store/ProductGrid";
```

- [ ] **Step 4: Update `app/store/page.tsx` to use only storefront catalog imports**

```tsx
import { StorefrontFilterPanel } from "@/components/storefront/catalog/StorefrontFilterPanel";
import { StorefrontControls } from "@/components/storefront/catalog/StorefrontControls";
import { StorefrontProductGrid } from "@/components/storefront/catalog/StorefrontProductGrid";
```

- [ ] **Step 5: Mark the old `store/*` files as internal migration targets to be split or renamed next**

Run: `rg -n "@/components/store/" app src -g "*.tsx"`
Expected: storefront route imports are reduced to intentional survivors only.

- [ ] **Step 6: Verify storefront structure**

Run: `npx jest --runInBand tests/unit/storefront-structure-regression.test.tsx`
Expected: PASS

Run: `npx eslint app/store/page.tsx src/components/storefront/catalog/StorefrontFilterPanel.tsx src/components/storefront/catalog/StorefrontControls.tsx src/components/storefront/catalog/StorefrontProductGrid.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/store/page.tsx src/components/storefront/catalog/StorefrontFilterPanel.tsx src/components/storefront/catalog/StorefrontControls.tsx src/components/storefront/catalog/StorefrontProductGrid.tsx src/components/store/FilterPanel.tsx src/components/store/StoreControls.tsx src/components/store/ProductGrid.tsx tests/unit/storefront-structure-regression.test.tsx
git commit -m "refactor: normalize storefront catalog component structure"
```

### Task 5: Split The Highest-Risk Oversized Components

**Files:**
- Create: `src/components/inventory/product-form/ProductFormMediaSection.tsx`
- Create: `src/components/inventory/product-form/ProductFormDetailsSection.tsx`
- Create: `src/components/inventory/product-form/ProductFormVariantsSection.tsx`
- Create: `src/components/checkout/CheckoutPolicyPanel.tsx`
- Create: `src/components/checkout/CheckoutPaymentSection.tsx`
- Create: `src/components/admin/inventory/InventoryToolbar.tsx`
- Create: `src/components/admin/inventory/InventoryTable.tsx`
- Modify: `src/components/inventory/ProductForm.tsx`
- Modify: `src/components/checkout/CheckoutForm.tsx`
- Modify: `app/admin/inventory/client.tsx`

- [ ] **Step 1: Write characterization tests before decomposition**

```tsx
import { renderToStaticMarkup } from "react-dom/server";

import { ProductForm } from "@/components/inventory/ProductForm";

describe("product form characterization", () => {
  it("renders core inventory fields", () => {
    const html = renderToStaticMarkup(
      <ProductForm onSubmit={async () => {}} onCancel={() => {}} />,
    );

    expect(html).toContain("Brand");
    expect(html).toContain("Category");
  });
});
```

- [ ] **Step 2: Run characterization tests to freeze current behavior**

Run: `npx jest --runInBand tests/unit/product-form-characterization.test.tsx`
Expected: PASS or adjusted assertions after first capture.

- [ ] **Step 3: Extract presentational sections without moving fetch/mutation ownership**

```tsx
<ProductFormDetailsSection
  category={category}
  condition={condition}
  brandInput={brandInput}
  modelInput={modelInput}
  name={name}
  onCategoryChange={setCategory}
  onConditionChange={setCondition}
/>
```

```tsx
<CheckoutPolicyPanel
  fulfillment={fulfillment}
  supportEmail="null@gmail.com"
/>
```

```tsx
<InventoryToolbar
  searchQuery={searchQuery}
  stockStatusFilter={stockStatusFilter}
  selectedCount={selectedCount}
/>
```

- [ ] **Step 4: Keep each parent file under a smaller, auditable size target**

Run: `@( 'src/components/inventory/ProductForm.tsx', 'src/components/checkout/CheckoutForm.tsx', 'app/admin/inventory/client.tsx') | ForEach-Object { (Get-Content $_ | Measure-Object -Line).Lines }`
Expected: each parent shrinks materially from the current baseline.

- [ ] **Step 5: Run focused verification**

Run: `npx eslint src/components/inventory/ProductForm.tsx src/components/checkout/CheckoutForm.tsx app/admin/inventory/client.tsx src/components/inventory/product-form src/components/checkout src/components/admin/inventory`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/inventory/ProductForm.tsx src/components/inventory/product-form src/components/checkout/CheckoutForm.tsx src/components/checkout/CheckoutPolicyPanel.tsx src/components/checkout/CheckoutPaymentSection.tsx app/admin/inventory/client.tsx src/components/admin/inventory/InventoryToolbar.tsx src/components/admin/inventory/InventoryTable.tsx
git commit -m "refactor: split oversized frontend components"
```

### Task 6: Final Cleanup Sweep And Verification

**Files:**
- Modify: any touched files above
- Create or update: targeted tests

- [ ] **Step 1: Scan for stale migration markers and dead wrappers**

Run: `rg -n "FIXED VERSION|OPTIMIZATION:|NEW:|StorefrontSearchOverlay as SearchOverlay|StorefrontCartDrawer as CartDrawer|ProductGrid as CatalogProductGrid|ProductCard as CatalogProductCard" app src -g "*.ts" -g "*.tsx"`
Expected: no low-signal migration comments or dead alias wrappers remain in active frontend paths.

- [ ] **Step 2: Scan for removed-feature vocabulary**

Run: `rg -n "pickup chat|Lightspeed|lightspeed" app src -g "*.ts" -g "*.tsx"`
Expected: only intentional backend/domain references remain, not customer/admin UI residue.

- [ ] **Step 3: Run targeted frontend tests**

Run: `npx jest --runInBand tests/unit/frontend-structure-standards.test.ts tests/unit/storefront-structure-regression.test.tsx tests/unit/checkout-form-branding.test.tsx tests/unit/admin-error-branding.test.tsx tests/unit/admin-profile-branding.test.tsx tests/unit/admin-shipping-settings-branding.test.tsx tests/unit/admin-transactions-detail-branding.test.tsx`
Expected: PASS

- [ ] **Step 4: Run full static verification**

Run: `npx eslint app src tests/unit`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Review git diff for dead files and unexpected wrappers**

Run: `git diff --stat`
Expected: moved files, smaller route entrypoints, fewer wrapper-only modules, and no accidental backend contract changes.

- [ ] **Step 6: Commit**

```bash
git add app src tests/unit docs/frontend-standards.md docs/superpowers/plans/2026-06-30-frontend-cleanup-standardization.md
git commit -m "refactor: standardize frontend structure"
```

