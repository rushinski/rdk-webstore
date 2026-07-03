# Codebase Cleanup And Vendor Surface Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove obsolete Stripe, PayRilla, NoFraud, and ZipTax surfaces while finishing the admin-surface cleanup and standardization pass across the remaining oversized modules.

**Architecture:** Treat this as two coordinated tracks. First, delete dead vendor-specific surfaces end-to-end at the route, service, data-model, UI, doc, and schema layers so the codebase stops modeling abandoned integrations. Second, continue reducing oversized admin modules into thin orchestration surfaces backed by focused hooks, view helpers, and presentational subcomponents.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase SQL migrations, Jest structure tests, `tsc --noEmit`, ripgrep.

---

## File Structure

**Vendor removal targets**
- Remove runtime payment/tax surfaces:
  - `src/components/checkout/CheckoutForm.tsx`
  - `src/types/domain/payrilla.ts`
  - `src/services/payrilla-charge-service.ts`
  - `src/services/nofraud-service.ts`
  - `src/services/ziptax-service.ts`
  - `src/lib/secrets/payrilla-secrets.ts`
  - `app/api/webhooks/payrilla/route.ts`
  - `app/admin/settings/taxes/page.tsx`
- Remove vendor-specific admin/detail displays:
  - `src/components/admin/transactions/order-details/AdminTransactionDetailScreen.tsx`
  - `src/components/admin/transactions/order-details/transactionPaymentView.tsx`
  - `src/components/admin/transactions/order-details/TransactionOrderDetailsPanel.tsx`
  - `src/components/admin/transactions/order-details/types.ts`
  - `src/components/admin/customers/customer-details/CustomerDetailsPanel.tsx`
  - `src/components/admin/customers/customer-details/useAdminCustomerDetailData.ts`
- Modify vendor-linked domain/data layers:
  - `src/repositories/payment-transactions-repo.ts`
  - `src/repositories/orders-repo.ts`
  - `src/services/orders-service.ts`
  - `src/services/evidence-service.ts`
  - `app/api/admin/orders/[orderId]/refund/route.ts`
  - `app/api/admin/customers/[customerId]/route.ts`
  - `app/api/admin/customers/route.ts`
  - `src/types/db/database.types.ts`
- Remove docs for abandoned integrations:
  - `docs/payrilla/WEBHOOKS.md`
  - `docs/payrilla/HOSTED_TOKENIZATION.md`
  - `docs/payrilla/DIGITAL_WALLETS.md`
  - `docs/payrilla/API_SPEC.md`
  - plus Stripe references in `README.md`, `docs/ARCHITECTURE.md`, `docs/INFRA_GUIDE.md`, `docs/MONITORING_GUIDE.md`, `docs/PROJECT_OVERVIEW.md`, `docs/RUNBOOK.md`, `docs/SECURITY.md`
- Add schema cleanup migration(s):
  - `supabase/migrations/<timestamp>_remove_legacy_payment_tax_surfaces.sql`

**Admin cleanup targets after vendor removal**
- `src/components/admin/transactions/order-details/AdminTransactionDetailScreen.tsx`
- `src/components/admin/orders/OrderItemDetailsModal.tsx`
- `src/components/admin/catalog/AdminCatalogScreen.tsx`
- `src/components/admin/nexus/HomeOfficeAddressForm.tsx`
- `src/components/admin/nexus/HomeOfficeChangeImpactModal.tsx`
- Add or update structure tests under `tests/unit/`

---

### Task 1: Freeze The Removal Scope With Search-Based Tests

**Files:**
- Create: `tests/unit/legacy-vendor-surfaces-structure.test.ts`
- Modify: `package.json` (only if a dedicated test script is needed; otherwise skip)
- Test: `tests/unit/legacy-vendor-surfaces-structure.test.ts`

- [ ] **Step 1: Write the failing structure test**

```ts
import fs from "node:fs";
import path from "node:path";

describe("legacy vendor surface removal scope", () => {
  it("tracks PayRilla, NoFraud, ZipTax, and Stripe runtime surfaces explicitly", () => {
    const targets = [
      "src/components/checkout/CheckoutForm.tsx",
      "src/services/payrilla-charge-service.ts",
      "src/services/nofraud-service.ts",
      "src/services/ziptax-service.ts",
      "app/api/webhooks/payrilla/route.ts",
      "app/admin/settings/taxes/page.tsx",
    ];

    for (const target of targets) {
      expect(fs.existsSync(path.join(process.cwd(), target))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it passes before removal**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/legacy-vendor-surfaces-structure.test.ts`
Expected: PASS, confirming the removal scope is anchored to concrete files before deletion starts.

- [ ] **Step 3: Record search baselines for vendor references**

Run:

```powershell
rg -n --hidden -S "stripe|payrilla|nofraud|ziptax|zip-tax|zip tax" src app docs supabase
```

Expected: Matches across checkout, admin transactions/customers, docs, and Supabase migrations/types. Save the output in the task notes or PR description for comparison after removal.

- [ ] **Step 4: Commit the safety net**

```bash
git add tests/unit/legacy-vendor-surfaces-structure.test.ts
git commit -m "test: lock legacy vendor removal scope"
```

### Task 2: Remove Runtime Vendor Integrations And Replace Them With Neutral Checkout/Order Flows

**Files:**
- Modify: `src/components/checkout/CheckoutForm.tsx`
- Modify: `src/components/checkout/CheckoutFooterSection.tsx`
- Modify: `src/components/admin/transactions/order-details/AdminTransactionDetailScreen.tsx`
- Modify: `src/components/admin/transactions/order-details/transactionPaymentView.tsx`
- Modify: `src/components/admin/transactions/order-details/TransactionOrderDetailsPanel.tsx`
- Modify: `src/components/admin/transactions/order-details/types.ts`
- Modify: `src/components/admin/customers/customer-details/CustomerDetailsPanel.tsx`
- Modify: `src/components/admin/customers/customer-details/useAdminCustomerDetailData.ts`
- Delete: `src/types/domain/payrilla.ts`
- Delete: `src/services/payrilla-charge-service.ts`
- Delete: `src/services/nofraud-service.ts`
- Delete: `src/services/ziptax-service.ts`
- Delete: `src/lib/secrets/payrilla-secrets.ts`
- Delete: `app/api/webhooks/payrilla/route.ts`
- Delete: `app/admin/settings/taxes/page.tsx`
- Test: `tests/unit/refund-order-modal-structure.test.ts`
- Test: `tests/unit/state-detail-modal-surface-structure.test.ts`
- Test: `tests/unit/inventory-client-surface-structure.test.ts`

- [ ] **Step 1: Write failing structure tests for neutralized admin/payment surfaces**

```ts
import fs from "node:fs";
import path from "node:path";

describe("transaction surface neutrality", () => {
  it("removes provider-specific labels from transaction details panels", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/admin/transactions/order-details/TransactionOrderDetailsPanel.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("Payrilla");
    expect(source).not.toContain("NoFraud");
  });
});
```

- [ ] **Step 2: Run the new test to verify the current code fails**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/transaction-surface-neutrality.test.ts`
Expected: FAIL because the current panel still renders `Payrilla` and `NoFraud` labels.

- [ ] **Step 3: Replace runtime checkout/payment wiring with the remaining supported flow**

Implementation notes:
- Remove PayRilla script loading, hosted-tokenization lifecycle, NoFraud cookie capture, and vendor-specific error handling from `src/components/checkout/CheckoutForm.tsx`.
- Replace them with a provider-neutral checkout submission flow that only depends on the currently supported backend contract.
- If no card checkout survives after removal, collapse the component to fulfillment, guest email, address capture, and a single submit path.
- Update `src/components/checkout/CheckoutFooterSection.tsx` so CTA disabled-state logic no longer references PayRilla readiness.

- [ ] **Step 4: Remove provider-specific admin labels and fields**

Implementation notes:
- In `src/components/admin/transactions/order-details/transactionPaymentView.tsx`, replace `getNoFraudBadge()` and PayRilla-specific event names with generic payment event metadata or remove the fields outright.
- In `TransactionOrderDetailsPanel.tsx` and `types.ts`, remove `payrilla_*` and `nofraud_*` properties from the view contract.
- In `CustomerDetailsPanel.tsx` and `useAdminCustomerDetailData.ts`, remove `payrillaCustomerToken` from the customer detail surface.

- [ ] **Step 5: Delete dead vendor-only files and routes**

Run:

```powershell
Remove-Item -LiteralPath src\types\domain\payrilla.ts
Remove-Item -LiteralPath src\services\payrilla-charge-service.ts
Remove-Item -LiteralPath src\services\nofraud-service.ts
Remove-Item -LiteralPath src\services\ziptax-service.ts
Remove-Item -LiteralPath src\lib\secrets\payrilla-secrets.ts
Remove-Item -LiteralPath app\api\webhooks\payrilla\route.ts
Remove-Item -LiteralPath app\admin\settings\taxes\page.tsx
```

Expected: Files removed cleanly with no dependency references left in `src/` or `app/`.

- [ ] **Step 6: Verify removal**

Run:

```powershell
rg -n --hidden -S "payrilla|nofraud|ziptax" src app
```

Expected: No matches, or only intentional migration/type comments scheduled for later schema cleanup.

- [ ] **Step 7: Commit the runtime removal**

```bash
git add src app tests
git commit -m "refactor: remove legacy payment and tax runtime surfaces"
```

### Task 3: Remove Legacy Payment/Tax Fields From Repositories, APIs, And Schema

**Files:**
- Modify: `src/repositories/payment-transactions-repo.ts`
- Modify: `src/repositories/orders-repo.ts`
- Modify: `src/services/orders-service.ts`
- Modify: `src/services/evidence-service.ts`
- Modify: `app/api/admin/orders/[orderId]/refund/route.ts`
- Modify: `app/api/admin/customers/[customerId]/route.ts`
- Modify: `app/api/admin/customers/route.ts`
- Modify: `src/types/db/database.types.ts`
- Create: `supabase/migrations/20260703_remove_legacy_payment_tax_surfaces.sql`
- Test: `tests/unit/server-session.test.ts`

- [ ] **Step 1: Write a failing search check for legacy DB/API fields**

Run:

```powershell
rg -n --hidden -S "payrilla_|nofraud_|stripe_|tax_rate_cache|tenant_payrilla_credentials|stripe_events" src app supabase src/types/db
```

Expected: Matches in repositories, route handlers, generated DB types, and historical migrations.

- [ ] **Step 2: Create the schema-removal migration**

Migration should remove or rename only live schema surfaces, not historical migration files:
- drop obsolete columns such as `payrilla_*`, `nofraud_*`, `stripe_*`, `stripe_tax_*`, `stripe_customer_id`, `stripe_account_id`, `payrilla_customer_token`
- drop obsolete tables such as `tax_rate_cache` and `tenant_payrilla_credentials`
- drop old webhook-event storage if still live and unused
- preserve order/payment history data only if it is still required by product requirements; otherwise migrate to generic columns first, then drop vendor-specific fields

- [ ] **Step 3: Update repository and route contracts to generic payment terms**

Implementation notes:
- `payment-transactions-repo.ts` should expose generic status/reference/auth fields or a narrower neutral model.
- `orders-service.ts` and admin refund routes must stop reading `payrilla_reference_number` / `payrilla_status`.
- customer APIs must stop selecting `payrilla_customer_token`.

- [ ] **Step 4: Regenerate database types after migration design is finalized**

Run the project’s existing type-generation flow for Supabase, then update:

```powershell
Get-Content src\types\db\database.types.ts
```

Expected: legacy vendor columns/tables removed from generated types.

- [ ] **Step 5: Verify schema-level cleanup references**

Run:

```powershell
rg -n --hidden -S "payrilla_|nofraud_|stripe_|tax_rate_cache|tenant_payrilla_credentials" src app supabase src/types/db
```

Expected: only historical migration files remain, or zero matches if historical cleanup is also desired.

- [ ] **Step 6: Commit the schema and API cleanup**

```bash
git add src app supabase tests
git commit -m "refactor: remove legacy payment and tax schema surfaces"
```

### Task 4: Remove Vendor Docs And Realign Project Documentation

**Files:**
- Delete: `docs/payrilla/WEBHOOKS.md`
- Delete: `docs/payrilla/HOSTED_TOKENIZATION.md`
- Delete: `docs/payrilla/DIGITAL_WALLETS.md`
- Delete: `docs/payrilla/API_SPEC.md`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/INFRA_GUIDE.md`
- Modify: `docs/MONITORING_GUIDE.md`
- Modify: `docs/PROJECT_OVERVIEW.md`
- Modify: `docs/RUNBOOK.md`
- Modify: `docs/SECURITY.md`

- [ ] **Step 1: Delete dead vendor documentation**

```powershell
Remove-Item -LiteralPath docs\payrilla\WEBHOOKS.md
Remove-Item -LiteralPath docs\payrilla\HOSTED_TOKENIZATION.md
Remove-Item -LiteralPath docs\payrilla\DIGITAL_WALLETS.md
Remove-Item -LiteralPath docs\payrilla\API_SPEC.md
```

- [ ] **Step 2: Rewrite project-level docs away from Stripe/PayRilla/ZipTax/NoFraud claims**

Implementation notes:
- remove statements that payments are handled by Stripe or PayRilla
- remove references to Stripe Connect, Stripe events, PayRilla webhooks, and ZipTax rate caching
- update architecture docs so they reflect the surviving commerce/payment/tax posture only

- [ ] **Step 3: Verify docs are clean**

Run:

```powershell
rg -n --hidden -S "stripe|payrilla|nofraud|ziptax|zip-tax|zip tax" README.md docs
```

Expected: zero matches, unless a historical migration note intentionally preserves the old names.

- [ ] **Step 4: Commit the documentation cleanup**

```bash
git add README.md docs
git commit -m "docs: remove legacy vendor integration references"
```

### Task 5: Finish The Remaining Oversized Admin Surfaces In Priority Order

**Files:**
- Modify: `src/components/admin/transactions/order-details/AdminTransactionDetailScreen.tsx`
- Modify: `src/components/admin/orders/OrderItemDetailsModal.tsx`
- Modify: `src/components/admin/catalog/AdminCatalogScreen.tsx`
- Modify: `src/components/admin/nexus/HomeOfficeAddressForm.tsx`
- Modify: `src/components/admin/nexus/HomeOfficeChangeImpactModal.tsx`
- Create: focused extracted components/hooks under the same feature directories
- Create: structure tests under `tests/unit/`

- [ ] **Step 1: Add one structure test per remaining oversized surface before each extraction**

Suggested tests:
- `tests/unit/admin-transaction-detail-surface-structure.test.ts`
- `tests/unit/order-item-details-surface-structure.test.ts`
- `tests/unit/admin-catalog-surface-structure.test.ts`
- `tests/unit/home-office-address-form-structure.test.ts`
- `tests/unit/home-office-change-impact-structure.test.ts`

- [ ] **Step 2: Refactor `AdminTransactionDetailScreen.tsx`**

Implementation notes:
- extract header/action prop composition
- extract sidebar/content prop shaping
- isolate remaining payment-event session/event formatting from surface composition
- remove any remaining provider-specific assumptions introduced by legacy PayRilla/NoFraud flow

- [ ] **Step 3: Refactor `OrderItemDetailsModal.tsx`**

Implementation notes:
- move image normalization into a focused view/helper module
- move Escape-key and image-index state into a focused hook
- keep the modal file as chrome + composed sections only

- [ ] **Step 4: Refactor `AdminCatalogScreen.tsx`**

Implementation notes:
- extract page-local UI state into a focused hook
- move toolbar/content/modal prop composition into a surface helper
- keep screen file limited to orchestration over data, mutations, and UI state

- [ ] **Step 5: Refactor remaining Nexus home-office surfaces**

Implementation notes:
- split button-group selection logic and form-field update wiring from `HomeOfficeAddressForm.tsx`
- extract decision/alert copy or action cards from `HomeOfficeChangeImpactModal.tsx`

- [ ] **Step 6: Verify the admin cleanup wave**

Run:

```powershell
npm run test:jest:unit -- --runTestsByPath tests/unit/admin-transaction-detail-surface-structure.test.ts tests/unit/order-item-details-surface-structure.test.ts tests/unit/admin-catalog-surface-structure.test.ts tests/unit/home-office-address-form-structure.test.ts tests/unit/home-office-change-impact-structure.test.ts
npm run typecheck
```

Expected: PASS on all new structure tests and `tsc --noEmit`.

- [ ] **Step 7: Commit the admin surface cleanup**

```bash
git add src/components tests/unit
git commit -m "refactor: standardize remaining admin surfaces"
```

### Task 6: Final Dead-Code Sweep And Verification

**Files:**
- Modify: any now-unused imports/exports discovered during cleanup
- Modify: `docs/superpowers/plans/2026-07-03-codebase-cleanup-and-vendor-surface-removal.md` (mark completed items during execution)

- [ ] **Step 1: Run unused-reference searches**

```powershell
rg -n --hidden -S "payrilla|nofraud|ziptax|stripe_" src app docs
```

Expected: zero runtime/doc matches.

- [ ] **Step 2: Run the full verification set**

```powershell
npm run test:jest:unit
npm run typecheck
```

Expected: all unit structure suites pass and TypeScript passes with no vendor-surface leftovers.

- [ ] **Step 3: Review git diff for conceptual integrity**

Run:

```powershell
git diff --stat
git diff --name-only
```

Expected: deletions and refactors cluster by feature, with no accidental edits in unrelated areas.

- [ ] **Step 4: Commit the final sweep**

```bash
git add -A
git commit -m "chore: finalize cleanup and legacy surface removal"
```

