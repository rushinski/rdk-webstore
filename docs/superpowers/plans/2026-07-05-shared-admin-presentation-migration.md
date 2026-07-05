# Shared Admin Presentation Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the remaining shared admin shell and UI primitives into a module-owned shared presentation boundary and remove the final `src/components/admin/*` namespace.

**Architecture:** Create `src/modules/shared/presentation/admin/` as the only shared admin presentation boundary, with `shell/` and `ui/` subdirectories. Migrate shell first, then UI, update all consuming imports and tests, and finish with a namespace-removal sweep so no route, feature module, or test imports `@/components/admin/*`.

**Tech Stack:** Next.js App Router, React, TypeScript, Jest, ripgrep, PowerShell, git

---

### Task 1: Move Shared Admin Shell Into `src/modules/shared/presentation/admin/shell`

**Files:**
- Create: `src/modules/shared/presentation/admin/shell/AdminSidebar.tsx`
- Create: `src/modules/shared/presentation/admin/shell/AdminSidebarContent.tsx`
- Create: `src/modules/shared/presentation/admin/shell/AdminSidebarProfileDock.tsx`
- Create: `src/modules/shared/presentation/admin/shell/AdminTopbar.tsx`
- Create: `src/modules/shared/presentation/admin/shell/AdminBrandHeader.tsx`
- Create: `src/modules/shared/presentation/admin/shell/AdminNavItem.tsx`
- Create: `src/modules/shared/presentation/admin/shell/adminSidebarNavigation.ts`
- Modify: `src/modules/app-shell/presentation/AdminLayoutShell.tsx`
- Modify: `src/components/shell/ClientShell.tsx`
- Modify: `tests/unit/admin-shell-branding.test.tsx`
- Modify: `tests/unit/admin-sidebar-structure.test.ts`
- Delete: `src/components/admin/shell/AdminSidebar.tsx`
- Delete: `src/components/admin/shell/AdminSidebarContent.tsx`
- Delete: `src/components/admin/shell/AdminSidebarProfileDock.tsx`
- Delete: `src/components/admin/shell/AdminTopbar.tsx`
- Delete: `src/components/admin/shell/AdminBrandHeader.tsx`
- Delete: `src/components/admin/shell/AdminNavItem.tsx`
- Delete: `src/components/admin/shell/adminSidebarNavigation.ts`

- [ ] **Step 1: Write the failing shell path assertions**

```ts
import fs from "node:fs";
import path from "node:path";

describe("admin sidebar structure", () => {
  it("reads shell modules from the shared admin presentation boundary", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/shared/presentation/admin/shell/AdminSidebar.tsx",
      ),
      "utf8",
    );

    expect(source).toContain(
      "@/modules/shared/presentation/admin/shell/adminSidebarNavigation",
    );
    expect(source).toContain(
      "@/modules/shared/presentation/admin/shell/AdminSidebarContent",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/admin-sidebar-structure.test.ts tests/unit/admin-shell-branding.test.tsx`
Expected: FAIL because `src/modules/shared/presentation/admin/shell/*` does not exist yet

- [ ] **Step 3: Move the shell files and update imports**

```ts
// src/modules/app-shell/presentation/AdminLayoutShell.tsx
import { AdminSidebar } from "@/modules/shared/presentation/admin/shell/AdminSidebar";
import { AdminTopbar } from "@/modules/shared/presentation/admin/shell/AdminTopbar";

// src/components/shell/ClientShell.tsx
import { AdminSidebar } from "@/modules/shared/presentation/admin/shell/AdminSidebar";

// src/modules/shared/presentation/admin/shell/AdminSidebar.tsx
import { AdminBrandHeader } from "@/modules/shared/presentation/admin/shell/AdminBrandHeader";
import { AdminSidebarContent } from "@/modules/shared/presentation/admin/shell/AdminSidebarContent";
import {
  getAdminSidebarActiveGroups,
  type AdminSidebarGroupKey,
} from "@/modules/shared/presentation/admin/shell/adminSidebarNavigation";

// src/modules/shared/presentation/admin/shell/AdminSidebarContent.tsx
import { AdminNavItem } from "@/modules/shared/presentation/admin/shell/AdminNavItem";
import { AdminSidebarProfileDock } from "@/modules/shared/presentation/admin/shell/AdminSidebarProfileDock";
import type { AdminSidebarGroupKey } from "@/modules/shared/presentation/admin/shell/adminSidebarNavigation";
import { adminSidebarItems } from "@/modules/shared/presentation/admin/shell/adminSidebarNavigation";
```

- [ ] **Step 4: Update shell tests to the new shared-module paths**

```ts
// tests/unit/admin-shell-branding.test.tsx
import { AdminTopbar } from "@/modules/shared/presentation/admin/shell/AdminTopbar";

// tests/unit/admin-sidebar-structure.test.ts
const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/modules/shared/presentation/admin/shell/AdminSidebar.tsx",
  ),
  "utf8",
);
```

- [ ] **Step 5: Run shell verification**

Run: `npx jest tests/unit/admin-sidebar-structure.test.ts tests/unit/admin-shell-branding.test.tsx`
Expected: PASS

- [ ] **Step 6: Run typecheck and import sweep**

Run: `npm run typecheck`
Expected: PASS

Run: `rg -n "@/components/admin/shell|src/components/admin/shell" src app tests`
Expected: no output

- [ ] **Step 7: Commit**

```bash
git add src/modules/shared/presentation/admin/shell src/modules/app-shell/presentation/AdminLayoutShell.tsx src/components/shell/ClientShell.tsx tests/unit/admin-shell-branding.test.tsx tests/unit/admin-sidebar-structure.test.ts src/components/admin/shell
git commit -m "refactor: move shared admin shell into shared module"
```

### Task 2: Move Shared Admin UI Into `src/modules/shared/presentation/admin/ui`

**Files:**
- Create: `src/modules/shared/presentation/admin/ui/AdminEmptyState.tsx`
- Create: `src/modules/shared/presentation/admin/ui/AdminMetricCard.tsx`
- Create: `src/modules/shared/presentation/admin/ui/AdminPageHeader.tsx`
- Create: `src/modules/shared/presentation/admin/ui/AdminSectionCard.tsx`
- Create: `src/modules/shared/presentation/admin/ui/AdminStatusBadge.tsx`
- Create: `src/modules/shared/presentation/admin/ui/adminButtonStyles.ts`
- Create: `src/modules/shared/presentation/admin/ui/adminFormStyles.ts`
- Modify: `src/components/ui/ConfirmDialog.tsx`
- Modify: `src/modules/dashboard/presentation/admin/AdminDashboardScreen.tsx`
- Modify: `src/modules/catalog/presentation/admin/catalog/AdminCatalogScreen.tsx`
- Modify: `src/modules/catalog/presentation/admin/inventory/InventoryClient.tsx`
- Modify: `src/modules/customers/presentation/admin/AdminCustomersScreen.tsx`
- Modify: `src/modules/nexus/presentation/admin/NexusTrackerClient.tsx`
- Modify: `src/modules/orders/presentation/admin/transactions/AdminTransactionsScreen.tsx`
- Modify: `src/modules/orders/presentation/admin/transaction-detail/AdminTransactionDetailScreen.tsx`
- Modify: `src/modules/orders/presentation/admin/shipping/AdminShippingScreen.tsx`
- Modify: `src/modules/orders/presentation/admin/pickups/AdminPickupsScreen.tsx`
- Modify: `src/modules/settings/presentation/admin/profile/AdminProfilePageContent.tsx`
- Modify: `src/modules/settings/presentation/admin/shipping/AdminShippingSettingsScreen.tsx`
- Modify: `src/modules/settings/presentation/admin/store-access/StoreAccessSettingsPageContent.tsx`
- Modify: `src/modules/settings/presentation/admin/tax/TaxSettingsPageContent.tsx`
- Modify: `tests/unit/admin-primitives-branding.test.tsx`
- Delete: `src/components/admin/ui/AdminEmptyState.tsx`
- Delete: `src/components/admin/ui/AdminMetricCard.tsx`
- Delete: `src/components/admin/ui/AdminPageHeader.tsx`
- Delete: `src/components/admin/ui/AdminSectionCard.tsx`
- Delete: `src/components/admin/ui/AdminStatusBadge.tsx`
- Delete: `src/components/admin/ui/adminButtonStyles.ts`
- Delete: `src/components/admin/ui/adminFormStyles.ts`

- [ ] **Step 1: Write the failing shared UI path assertions**

```tsx
import { renderToStaticMarkup } from "react-dom/server";

import { AdminPageHeader } from "@/modules/shared/presentation/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/modules/shared/presentation/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/modules/shared/presentation/admin/ui/AdminStatusBadge";

describe("admin primitives", () => {
  it("render with solesneakers admin tokens", () => {
    const html = renderToStaticMarkup(
      <>
        <AdminPageHeader title="Dashboard" description="Overview" />
        <AdminSectionCard title="Orders">body</AdminSectionCard>
        <AdminStatusBadge tone="neutral">Open</AdminStatusBadge>
      </>,
    );

    expect(html).toContain("brand-surface");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/admin-primitives-branding.test.tsx`
Expected: FAIL because the shared UI module path does not exist yet

- [ ] **Step 3: Move UI files and update consuming imports**

```ts
// src/modules/dashboard/presentation/admin/AdminDashboardScreen.tsx
import { AdminMetricCard } from "@/modules/shared/presentation/admin/ui/AdminMetricCard";
import { AdminPageHeader } from "@/modules/shared/presentation/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/modules/shared/presentation/admin/ui/AdminSectionCard";

// src/modules/catalog/presentation/admin/catalog/AdminCatalogScreen.tsx
import { AdminPageHeader } from "@/modules/shared/presentation/admin/ui/AdminPageHeader";

// src/modules/orders/presentation/admin/transaction-detail/TransactionHeaderActions.tsx
import { AdminStatusBadge } from "@/modules/shared/presentation/admin/ui/AdminStatusBadge";
import { adminButtonStyles } from "@/modules/shared/presentation/admin/ui/adminButtonStyles";

// src/components/ui/ConfirmDialog.tsx
import { adminButtonStyles } from "@/modules/shared/presentation/admin/ui/adminButtonStyles";
```

- [ ] **Step 4: Update UI primitive tests to the new shared-module paths**

```tsx
// tests/unit/admin-primitives-branding.test.tsx
import { AdminPageHeader } from "@/modules/shared/presentation/admin/ui/AdminPageHeader";
import { AdminSectionCard } from "@/modules/shared/presentation/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/modules/shared/presentation/admin/ui/AdminStatusBadge";
```

- [ ] **Step 5: Run focused UI verification**

Run: `npx jest tests/unit/admin-primitives-branding.test.tsx tests/unit/admin-dashboard-branding.test.tsx tests/unit/admin-profile-branding.test.tsx tests/unit/admin-nexus-branding.test.tsx tests/unit/admin-shipping-settings-branding.test.tsx`
Expected: PASS

- [ ] **Step 6: Run typecheck and import sweep**

Run: `npm run typecheck`
Expected: PASS

Run: `rg -n "@/components/admin/ui|src/components/admin/ui" src app tests`
Expected: no output

- [ ] **Step 7: Commit**

```bash
git add src/modules/shared/presentation/admin/ui src/components/ui/ConfirmDialog.tsx src/modules/dashboard/presentation/admin/AdminDashboardScreen.tsx src/modules/catalog/presentation/admin src/modules/customers/presentation/admin src/modules/nexus/presentation/admin src/modules/orders/presentation/admin src/modules/settings/presentation/admin tests/unit/admin-primitives-branding.test.tsx src/components/admin/ui
git commit -m "refactor: move shared admin ui into shared module"
```

### Task 3: Remove `src/components/admin` Namespace And Update Migration Messaging

**Files:**
- Modify: `docs/superpowers/specs/2026-07-05-shared-admin-presentation-design.md`
- Modify: `src/modules/orders/presentation/README.md`
- Modify: any touched migration tests that still describe "thin shims" for shell/UI
- Delete: `src/components/admin/`

- [ ] **Step 1: Update stale wording that implies legacy admin component paths are valid**

```md
Legacy admin presentation now lives under `src/modules/shared/presentation/admin/*`.
The old `src/components/admin/*` namespace has been removed and must not be reintroduced.
```

- [ ] **Step 2: Remove the final legacy namespace directory**

Run:

```powershell
if (Test-Path src/components/admin) {
  Remove-Item src/components/admin -Recurse -Force
}
```

Expected: `src/components/admin` no longer exists

- [ ] **Step 3: Run final namespace sweep**

Run: `rg -n "@/components/admin/|src/components/admin/" src app tests docs`
Expected: no output

- [ ] **Step 4: Run final verification**

Run: `npm run typecheck`
Expected: PASS

Run: `npx jest tests/unit/admin-primitives-branding.test.tsx tests/unit/admin-shell-branding.test.tsx tests/unit/admin-sidebar-structure.test.ts tests/unit/admin-line-chart-structure.test.ts tests/unit/admin-dashboard-module-migration-structure.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-07-05-shared-admin-presentation-design.md src/modules/orders/presentation/README.md tests/unit src/components/admin
git commit -m "refactor: remove legacy admin components namespace"
```

### Task 4: Final Shared Admin Boundary Audit

**Files:**
- Modify: `docs/superpowers/specs/2026-07-05-shared-admin-presentation-design.md` (only if implementation reality differs and needs a final note)
- Test: `tests/unit/frontend-structure-standards.test.ts`

- [ ] **Step 1: Run a final boundary sweep**

Run: `rg -n "@/modules/shared/presentation/admin/(shell|ui)" src app tests`
Expected: output shows feature modules, shell consumers, and tests using only the shared module boundary

- [ ] **Step 2: Run structure standards verification**

Run: `npx jest tests/unit/frontend-structure-standards.test.ts`
Expected: PASS, or update the structure standards test if it still encodes the pre-migration admin namespace

- [ ] **Step 3: Run final repo check**

Run: `git status --short`
Expected: clean working tree

- [ ] **Step 4: Commit any final standards-test adjustment**

```bash
git add tests/unit/frontend-structure-standards.test.ts docs/superpowers/specs/2026-07-05-shared-admin-presentation-design.md
git commit -m "test: align structure standards with shared admin module"
```
