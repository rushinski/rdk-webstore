# Solesneakers Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the admin-facing `solesneakers` frontend by replacing the remaining legacy dark/red admin UI with a consistent brand-based admin system while preserving all route behavior and backend contracts.

**Architecture:** Build a small shared admin UI layer first, then migrate live admin sections in the approved order so cards, tables, forms, badges, drawers, and dialogs all share one visual language. Only split large files when the active section work clearly benefits from smaller focused subviews.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Jest

---

## File Structure Map

### Shared admin primitives and support surfaces

- Create: `src/components/admin/ui/AdminPageHeader.tsx`
- Create: `src/components/admin/ui/AdminSectionCard.tsx`
- Create: `src/components/admin/ui/AdminMetricCard.tsx`
- Create: `src/components/admin/ui/AdminEmptyState.tsx`
- Create: `src/components/admin/ui/AdminStatusBadge.tsx`
- Create: `src/components/admin/ui/adminFormStyles.ts`
- Create: `src/components/admin/ui/adminButtonStyles.ts`
- Modify: `src/components/ui/ConfirmDialog.tsx`
- Modify: `src/components/admin/AdminNotificationCenter.tsx`
- Modify: `src/components/admin/AdminNotificationsDrawer.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/components/admin/AdminTopbar.tsx`
- Test: `tests/unit/admin-shell-branding.test.tsx`
- Create: `tests/unit/admin-primitives-branding.test.tsx`

### Phase 1: dashboard / orders / shipping

- Modify: `app/admin/page.tsx`
- Modify: `app/admin/dashboard/page.tsx`
- Modify: `app/admin/orders/[orderId]/page.tsx`
- Modify: `app/admin/shipping/page.tsx`
- Modify: `app/admin/pickups/page.tsx`
- Modify: `src/components/admin/orders/OrderItemDetailsModal.tsx`
- Modify: `src/components/admin/orders/RefundOrderModal.tsx`
- Modify: `src/components/admin/shipping/CreateLabelForm.tsx`
- Modify: `src/components/admin/shipping/OriginModal.tsx`

### Phase 2: inventory / transactions / settings

- Modify: `app/admin/inventory/page.tsx`
- Modify: `app/admin/inventory/client.tsx`
- Modify: `app/admin/inventory/create/page.tsx`
- Modify: `app/admin/inventory/create/client.tsx`
- Modify: `app/admin/inventory/[id]/edit/page.tsx`
- Modify: `app/admin/inventory/[id]/edit/client.tsx`
- Modify: `src/components/inventory/ProductForm.tsx`
- Modify: `src/components/inventory/TagInput.tsx`
- Modify: `src/components/admin/inventory/InventoryProductDetailsModal.tsx`
- Modify: `src/components/admin/inventory/SyncProductPreviewModal.tsx`
- Modify: `app/admin/transactions/page.tsx`
- Modify: `app/admin/transactions/[orderId]/page.tsx`
- Modify: `app/admin/settings/lightspeed/page.tsx`
- Modify: `app/admin/settings/store-access/page.tsx`
- Modify: `app/admin/settings/shipping/page.tsx`
- Modify: `app/admin/settings/taxes/page.tsx`
- Modify: `src/components/admin/settings/LightspeedSettingsPanel.tsx`
- Modify: `src/components/admin/settings/StoreAccessSettingsPanel.tsx`
- Modify: `src/components/admin/settings/TaxSettingsPanel.tsx`

### Phase 3: analytics / customers / chats

- Modify: `app/admin/analytics/traffic/page.tsx`
- Modify: `app/admin/analytics/financials/page.tsx`
- Modify: `src/components/admin/charts/TrafficChart.tsx`
- Modify: `src/components/admin/charts/SalesChart.tsx`
- Modify: `src/components/admin/charts/AdminLineChart.tsx`
- Modify: `app/admin/customers/page.tsx`
- Modify: `app/admin/customers/[customerId]/page.tsx`
- Modify: `app/admin/chats/page.tsx`

### Phase 4: profile / nexus / notifications / featured-items / catalog

- Modify: `app/admin/profile/page.tsx`
- Modify: `app/admin/nexus/page.tsx`
- Modify: `src/components/admin/nexus/NexusTrackerClient.tsx`
- Modify: `src/components/admin/nexus/NexusMap.tsx`
- Modify: `src/components/admin/nexus/HomeOfficeSetupModal.tsx`
- Modify: `src/components/admin/nexus/StateDetailModal.tsx`
- Modify: `app/admin/notifications/page.tsx`
- Modify: `app/admin/featured-items/page.tsx`
- Modify: `app/admin/featured-items/client.tsx`
- Modify: `app/admin/catalog/page.tsx`
- Modify: `app/admin/catalog/components/TagModals.tsx`
- Modify: `app/admin/error.tsx`

### Verification

- Test: `tests/unit/admin-shell-branding.test.tsx`
- Test: `tests/unit/admin-primitives-branding.test.tsx`
- Add or modify targeted admin tests as needed for touched sections

---

### Task 1: Build the Shared Admin UI Layer

**Files:**
- Create: `src/components/admin/ui/AdminPageHeader.tsx`
- Create: `src/components/admin/ui/AdminSectionCard.tsx`
- Create: `src/components/admin/ui/AdminMetricCard.tsx`
- Create: `src/components/admin/ui/AdminEmptyState.tsx`
- Create: `src/components/admin/ui/AdminStatusBadge.tsx`
- Create: `src/components/admin/ui/adminFormStyles.ts`
- Create: `src/components/admin/ui/adminButtonStyles.ts`
- Modify: `src/components/ui/ConfirmDialog.tsx`
- Modify: `src/components/admin/AdminNotificationCenter.tsx`
- Modify: `src/components/admin/AdminNotificationsDrawer.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/components/admin/AdminTopbar.tsx`
- Create: `tests/unit/admin-primitives-branding.test.tsx`
- Modify: `tests/unit/admin-shell-branding.test.tsx`

- [ ] **Step 1: Write the failing primitive branding test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";

describe("admin primitives", () => {
  it("render with solesneakers admin tokens", () => {
    const html = renderToStaticMarkup(
      <>
        <AdminPageHeader title="Dashboard" description="Overview" />
        <AdminSectionCard title="Orders">body</AdminSectionCard>
        <AdminStatusBadge tone="neutral">Open</AdminStatusBadge>
      </>,
    );

    expect(html).toContain("Dashboard");
    expect(html).toContain("Overview");
    expect(html).toContain("Orders");
    expect(html).toContain("Open");
    expect(html).toContain("brand-surface");
    expect(html).not.toContain("bg-zinc-900");
  });
});
```

- [ ] **Step 2: Run the primitive test to verify it fails**

Run: `npx jest --runInBand tests/unit/admin-primitives-branding.test.tsx`
Expected: FAIL with `Cannot find module '@/components/admin/ui/AdminPageHeader'`

- [ ] **Step 3: Add the shared admin primitives and style exports**

```tsx
// src/components/admin/ui/AdminPageHeader.tsx
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-brand-border pb-5">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-[0.08em] text-brand-text">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm text-brand-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
```

```tsx
// src/components/admin/ui/AdminSectionCard.tsx
export function AdminSectionCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-brand-border bg-brand-surface p-4 shadow-[0_16px_50px_rgba(17,17,17,0.04)] sm:p-6">
      {title ? (
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-brand-muted">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
```

```tsx
// src/components/admin/ui/AdminStatusBadge.tsx
const tones = {
  neutral: "border-brand-border bg-brand-page text-brand-text",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
} as const;
```

```ts
// src/components/admin/ui/adminFormStyles.ts
export const adminFormStyles = {
  input:
    "w-full border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text outline-none transition-colors focus:border-brand-text",
  label: "mb-1 block text-sm font-medium text-brand-text",
  help: "mt-1 text-xs text-brand-muted",
  error: "mt-1 text-xs text-red-700",
};
```

```ts
// src/components/admin/ui/adminButtonStyles.ts
export const adminButtonStyles = {
  primary:
    "inline-flex items-center justify-center border border-brand-text bg-brand-text px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-brand-page transition hover:bg-white",
  secondary:
    "inline-flex items-center justify-center border border-brand-border bg-brand-surface px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-brand-text transition hover:bg-brand-page",
  danger:
    "inline-flex items-center justify-center border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-red-700 transition hover:bg-red-100",
};
```

- [ ] **Step 4: Reskin shared admin support surfaces to use the new layer**

Apply the new primitives and style exports to:

- `src/components/ui/ConfirmDialog.tsx`
- `src/components/admin/AdminNotificationCenter.tsx`
- `src/components/admin/AdminNotificationsDrawer.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/AdminTopbar.tsx`

Keep behavior unchanged. Remove customer-facing `bg-zinc-*`, `border-zinc-*`, and `bg-red-600` button chrome from these shared admin supports.

- [ ] **Step 5: Run the primitive and shell tests to verify they pass**

Run: `npx jest --runInBand tests/unit/admin-primitives-branding.test.tsx tests/unit/admin-shell-branding.test.tsx`
Expected: PASS

- [ ] **Step 6: Run targeted verification**

Run: `npx eslint src/components/admin/ui/AdminPageHeader.tsx src/components/admin/ui/AdminSectionCard.tsx src/components/admin/ui/AdminMetricCard.tsx src/components/admin/ui/AdminEmptyState.tsx src/components/admin/ui/AdminStatusBadge.tsx src/components/admin/ui/adminFormStyles.ts src/components/admin/ui/adminButtonStyles.ts src/components/ui/ConfirmDialog.tsx src/components/admin/AdminNotificationCenter.tsx src/components/admin/AdminNotificationsDrawer.tsx src/components/admin/AdminSidebar.tsx src/components/admin/AdminTopbar.tsx tests/unit/admin-primitives-branding.test.tsx tests/unit/admin-shell-branding.test.tsx`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/ui src/components/ui/ConfirmDialog.tsx src/components/admin/AdminNotificationCenter.tsx src/components/admin/AdminNotificationsDrawer.tsx src/components/admin/AdminSidebar.tsx src/components/admin/AdminTopbar.tsx tests/unit/admin-primitives-branding.test.tsx tests/unit/admin-shell-branding.test.tsx
git commit -m "feat: add shared solesneakers admin ui layer"
```

### Task 2: Finish Dashboard, Orders, Shipping, and Pickups

**Files:**
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/dashboard/page.tsx`
- Modify: `app/admin/orders/[orderId]/page.tsx`
- Modify: `app/admin/shipping/page.tsx`
- Modify: `app/admin/pickups/page.tsx`
- Modify: `src/components/admin/orders/OrderItemDetailsModal.tsx`
- Modify: `src/components/admin/orders/RefundOrderModal.tsx`
- Modify: `src/components/admin/shipping/CreateLabelForm.tsx`
- Modify: `src/components/admin/shipping/OriginModal.tsx`

- [ ] **Step 1: Add a failing render test for the shared dashboard header language**

```tsx
import { renderToStaticMarkup } from "react-dom/server";

import DashboardPage from "../../app/admin/dashboard/page";

describe("app/admin/dashboard/page", () => {
  it("renders the admin overview framing", async () => {
    const html = renderToStaticMarkup(await DashboardPage());

    expect(html).toContain("Dashboard");
    expect(html).not.toContain("bg-zinc-900");
  });
});
```

- [ ] **Step 2: Run the dashboard test to verify the legacy baseline fails the new expectation**

Run: `npx jest --runInBand tests/unit/admin-dashboard-branding.test.tsx`
Expected: FAIL because legacy dark admin page chrome is still rendered

- [ ] **Step 3: Convert dashboard and order workflow surfaces onto shared admin cards, metric cards, and badges**

Use the new layer for:

- page headers
- top stat blocks
- section cards
- shipping / refund action blocks
- order and pickup status badges

Representative replacement shape:

```tsx
<AdminPageHeader title="Dashboard" description="Store overview and operational health." />
<div className="grid gap-4 md:grid-cols-3">
  <AdminMetricCard label="Orders" value={String(orderCount)} />
  <AdminMetricCard label="Open chats" value={String(openChats)} />
  <AdminMetricCard label="Pending pickups" value={String(pendingPickups)} />
</div>
```

- [ ] **Step 4: Convert shipping and pickup pages and their modal/form components**

For `app/admin/shipping/page.tsx` and the linked shipping components:

- keep all existing workflow logic
- replace dark table panels, destructive red primary buttons, and zinc form blocks
- extract focused internal sections only if the file becomes unsafe to restyle inline

Representative target:

```tsx
<AdminSectionCard title="Shipment Queue">
  <div className="overflow-x-auto">{/* existing rows and actions */}</div>
</AdminSectionCard>
```

- [ ] **Step 5: Run targeted verification**

Run: `npx eslint app/admin/page.tsx app/admin/dashboard/page.tsx app/admin/orders/[orderId]/page.tsx app/admin/shipping/page.tsx app/admin/pickups/page.tsx src/components/admin/orders/OrderItemDetailsModal.tsx src/components/admin/orders/RefundOrderModal.tsx src/components/admin/shipping/CreateLabelForm.tsx src/components/admin/shipping/OriginModal.tsx`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.tsx app/admin/dashboard/page.tsx app/admin/orders/[orderId]/page.tsx app/admin/shipping/page.tsx app/admin/pickups/page.tsx src/components/admin/orders/OrderItemDetailsModal.tsx src/components/admin/orders/RefundOrderModal.tsx src/components/admin/shipping/CreateLabelForm.tsx src/components/admin/shipping/OriginModal.tsx
git commit -m "feat: finish admin dashboard and fulfillment surfaces"
```

### Task 3: Finish Inventory, Transactions, and Settings

**Files:**
- Modify: `app/admin/inventory/page.tsx`
- Modify: `app/admin/inventory/client.tsx`
- Modify: `app/admin/inventory/create/page.tsx`
- Modify: `app/admin/inventory/create/client.tsx`
- Modify: `app/admin/inventory/[id]/edit/page.tsx`
- Modify: `app/admin/inventory/[id]/edit/client.tsx`
- Modify: `src/components/inventory/ProductForm.tsx`
- Modify: `src/components/inventory/TagInput.tsx`
- Modify: `src/components/admin/inventory/InventoryProductDetailsModal.tsx`
- Modify: `src/components/admin/inventory/SyncProductPreviewModal.tsx`
- Modify: `app/admin/transactions/page.tsx`
- Modify: `app/admin/transactions/[orderId]/page.tsx`
- Modify: `app/admin/settings/lightspeed/page.tsx`
- Modify: `app/admin/settings/store-access/page.tsx`
- Modify: `app/admin/settings/shipping/page.tsx`
- Modify: `app/admin/settings/taxes/page.tsx`
- Modify: `src/components/admin/settings/LightspeedSettingsPanel.tsx`
- Modify: `src/components/admin/settings/StoreAccessSettingsPanel.tsx`
- Modify: `src/components/admin/settings/TaxSettingsPanel.tsx`

- [ ] **Step 1: Add a failing transactions detail branding test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";

import { AdminTopbar } from "@/components/admin/AdminTopbar";

describe("admin transactions detail migration", () => {
  it("uses brand shell primitives as the route baseline", () => {
    const html = renderToStaticMarkup(<AdminTopbar />);
    expect(html).toContain("solesneakers admin");
  });
});
```

- [ ] **Step 2: Run the current typecheck before the largest form/table phase**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Restyle inventory routes and split `ProductForm` only where repeated blocks justify extraction**

Target repeated units:

- parsed preview block
- variants table rows
- image grid / uploader
- pricing / shipping settings panels
- sticky action bar

Preserve all validation and action logic.

- [ ] **Step 4: Convert transactions list/detail and settings panels onto shared cards, badges, tables, and form styles**

Key requirements:

- list/detail pages keep filtering and drawer behavior
- settings pages keep save flows, disabled states, validation, and current actions
- destructive actions remain red, but neutral flows move to the new brand layer

- [ ] **Step 5: Run targeted verification**

Run: `npx eslint app/admin/inventory/page.tsx app/admin/inventory/client.tsx app/admin/inventory/create/page.tsx app/admin/inventory/create/client.tsx app/admin/inventory/[id]/edit/page.tsx app/admin/inventory/[id]/edit/client.tsx src/components/inventory/ProductForm.tsx src/components/inventory/TagInput.tsx src/components/admin/inventory/InventoryProductDetailsModal.tsx src/components/admin/inventory/SyncProductPreviewModal.tsx app/admin/transactions/page.tsx app/admin/transactions/[orderId]/page.tsx app/admin/settings/lightspeed/page.tsx app/admin/settings/store-access/page.tsx app/admin/settings/shipping/page.tsx app/admin/settings/taxes/page.tsx src/components/admin/settings/LightspeedSettingsPanel.tsx src/components/admin/settings/StoreAccessSettingsPanel.tsx src/components/admin/settings/TaxSettingsPanel.tsx`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/admin/inventory app/admin/transactions app/admin/settings src/components/inventory src/components/admin/inventory src/components/admin/settings
git commit -m "feat: finish admin inventory payments and settings surfaces"
```

### Task 4: Finish Analytics, Customers, and Chats

**Files:**
- Modify: `app/admin/analytics/traffic/page.tsx`
- Modify: `app/admin/analytics/financials/page.tsx`
- Modify: `src/components/admin/charts/TrafficChart.tsx`
- Modify: `src/components/admin/charts/SalesChart.tsx`
- Modify: `src/components/admin/charts/AdminLineChart.tsx`
- Modify: `app/admin/customers/page.tsx`
- Modify: `app/admin/customers/[customerId]/page.tsx`
- Modify: `app/admin/chats/page.tsx`

- [ ] **Step 1: Add a failing analytics branding test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";

import FinancialsPage from "../../app/admin/analytics/financials/page";

describe("admin analytics financials", () => {
  it("renders on light admin surfaces", async () => {
    const html = renderToStaticMarkup(await FinancialsPage());
    expect(html).not.toContain("bg-zinc-900");
  });
});
```

- [ ] **Step 2: Run the analytics branding test to verify the old styling baseline fails**

Run: `npx jest --runInBand tests/unit/admin-analytics-branding.test.tsx`
Expected: FAIL because the current pages still render dark zinc cards

- [ ] **Step 3: Convert analytics, customers, and chats to shared section cards and table/list framing**

Requirements:

- keep chart data and series logic unchanged
- keep customer detail layouts and chat workflow behavior unchanged
- migrate page-level summaries, lists, stat blocks, and detail panes onto the new admin primitives

- [ ] **Step 4: Run targeted verification**

Run: `npx eslint app/admin/analytics/traffic/page.tsx app/admin/analytics/financials/page.tsx src/components/admin/charts/TrafficChart.tsx src/components/admin/charts/SalesChart.tsx src/components/admin/charts/AdminLineChart.tsx app/admin/customers/page.tsx app/admin/customers/[customerId]/page.tsx app/admin/chats/page.tsx`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/admin/analytics app/admin/customers app/admin/chats src/components/admin/charts
git commit -m "feat: finish admin insight and relationship surfaces"
```

### Task 5: Finish Profile, Nexus, Notifications, Featured Items, Catalog, and Admin Error State

**Files:**
- Modify: `app/admin/profile/page.tsx`
- Modify: `app/admin/nexus/page.tsx`
- Modify: `src/components/admin/nexus/NexusTrackerClient.tsx`
- Modify: `src/components/admin/nexus/NexusMap.tsx`
- Modify: `src/components/admin/nexus/HomeOfficeSetupModal.tsx`
- Modify: `src/components/admin/nexus/StateDetailModal.tsx`
- Modify: `app/admin/notifications/page.tsx`
- Modify: `app/admin/featured-items/page.tsx`
- Modify: `app/admin/featured-items/client.tsx`
- Modify: `app/admin/catalog/page.tsx`
- Modify: `app/admin/catalog/components/TagModals.tsx`
- Modify: `app/admin/error.tsx`

- [ ] **Step 1: Run a legacy-style scan against the remaining secondary admin surfaces**

Run: `rg -n "bg-zinc|border-zinc|text-gray|text-zinc|bg-red-600" app/admin/profile app/admin/nexus app/admin/notifications app/admin/featured-items app/admin/catalog src/components/admin/nexus app/admin/error.tsx`
Expected: multiple hits confirming the remaining scope

- [ ] **Step 2: Convert the remaining smaller admin pages and supporting nexus/modals**

Requirements:

- use shared page headers, cards, badges, and form styles
- preserve map, modal, and featured-items interactions
- keep notification behavior unchanged

- [ ] **Step 3: Run targeted verification**

Run: `npx eslint app/admin/profile/page.tsx app/admin/nexus/page.tsx src/components/admin/nexus/NexusTrackerClient.tsx src/components/admin/nexus/NexusMap.tsx src/components/admin/nexus/HomeOfficeSetupModal.tsx src/components/admin/nexus/StateDetailModal.tsx app/admin/notifications/page.tsx app/admin/featured-items/page.tsx app/admin/featured-items/client.tsx app/admin/catalog/page.tsx app/admin/catalog/components/TagModals.tsx app/admin/error.tsx`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/admin/profile app/admin/nexus app/admin/notifications app/admin/featured-items app/admin/catalog app/admin/error.tsx src/components/admin/nexus
git commit -m "feat: finish remaining admin secondary surfaces"
```

### Task 6: Final Admin Verification and Cleanup

**Files:**
- Modify: any touched files from Tasks 1-5
- Test: `tests/unit/admin-shell-branding.test.tsx`
- Test: `tests/unit/admin-primitives-branding.test.tsx`

- [ ] **Step 1: Scan for remaining legacy admin UI tokens**

Run: `rg -n "bg-zinc|border-zinc|text-gray|text-zinc|bg-red-600|Realdealkickzsc|rdk-logo" app/admin src/components/admin src/components/inventory src/components/orders src/components/ui/ConfirmDialog.tsx`
Expected: only intentional red validation/error states remain, or remaining hits are outside touched admin scope and explicitly documented

- [ ] **Step 2: Run the targeted admin verification suite**

Run: `npx jest --runInBand tests/unit/admin-shell-branding.test.tsx tests/unit/admin-primitives-branding.test.tsx`
Expected: PASS

- [ ] **Step 3: Run targeted admin lint**

Run: `npx eslint app/admin src/components/admin src/components/inventory src/components/orders src/components/ui/ConfirmDialog.tsx`
Expected: PASS, or exact unrelated blockers documented if existing baseline issues outside touched scope remain

- [ ] **Step 4: Run repository typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/admin src/components/admin src/components/inventory src/components/orders src/components/ui/ConfirmDialog.tsx tests/unit
git commit -m "chore: finalize solesneakers admin redesign"
```

