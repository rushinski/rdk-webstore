# Store Access Locking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded storefront unlock logic with tenant-backed admin settings, add an independent checkout lock, and bring the locked screens into the existing storefront/admin styling patterns.

**Architecture:** Persist store access settings in a tenant-scoped table, expose them through a small repository/service/API layer, use the same service in the proxy and checkout pages, and surface management through a dedicated admin settings page. Keep enforcement centralized so the proxy, server pages, and client UI cannot drift.

**Tech Stack:** Next.js App Router, Supabase Postgres + RLS migrations, typed repositories/services, Zod validation, Tailwind UI, Jest/ESLint/TypeScript.

---

## File Structure

- Create: `supabase/migrations/20260515120000_store_access_settings.sql`
- Create: `src/repositories/store-access-settings-repo.ts`
- Create: `src/services/store-access-settings-service.ts`
- Create: `app/api/admin/store-access/route.ts`
- Create: `app/admin/settings/store-access/page.tsx`
- Create: `src/components/admin/settings/StoreAccessSettingsPanel.tsx`
- Create: `src/components/checkout/CheckoutLockedNotice.tsx`
- Create: `src/lib/store-access/get-store-access-settings.ts`
- Modify: `src/types/db/database.types.ts`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/proxy/site-lock.ts`
- Modify: `app/locked/page.tsx`
- Modify: `app/locked/unlock-timer.tsx`
- Modify: `app/checkout/page.tsx`
- Modify: `app/checkout/start/page.tsx`
- Modify: `app/checkout/layout.tsx`
- Modify: `src/lib/validation/admin.ts`

### Task 1: Add Tenant Store Access Persistence

**Files:**
- Create: `supabase/migrations/20260515120000_store_access_settings.sql`
- Create: `src/repositories/store-access-settings-repo.ts`
- Create: `src/services/store-access-settings-service.ts`
- Modify: `src/types/db/database.types.ts`

- [ ] **Step 1: Write the failing repository/service test case notes as executable verification targets**

```ts
// Target behaviors to verify once the DB + repository layer exists:
// 1. Missing tenant settings resolve to defaults:
//    {
//      site_lock_enabled: false,
//      site_unlock_at: null,
//      checkout_lock_enabled: false,
//      checkout_lock_message: DEFAULT_CHECKOUT_LOCK_MESSAGE
//    }
// 2. Upsert by tenant_id overwrites previous values.
// 3. Service returns `isSiteLocked(now)` and `isCheckoutLocked()` helpers.
```

- [ ] **Step 2: Add the migration for a tenant-scoped store access settings table**

```sql
create table if not exists public.tenant_store_access_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  site_lock_enabled boolean not null default false,
  site_unlock_at timestamptz null,
  checkout_lock_enabled boolean not null default false,
  checkout_lock_message text not null default 'sorry we currently can not accept payments please message @realdealkickzsc on instagram the items you would like to purchase.',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists tenant_store_access_settings_tenant_id_key
  on public.tenant_store_access_settings (tenant_id);

alter table public.tenant_store_access_settings enable row level security;

create policy "Admins can manage store access settings"
  on public.tenant_store_access_settings
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = tenant_store_access_settings.tenant_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = tenant_store_access_settings.tenant_id
    )
  );

grant all on public.tenant_store_access_settings to service_role;
grant select, insert, update on public.tenant_store_access_settings to authenticated;
```

- [ ] **Step 3: Generate database types after the migration shape is finalized**

```bash
npm run gen:types:local
```

Expected: `src/types/db/database.types.ts` gains `tenant_store_access_settings`.

- [ ] **Step 4: Add a repository with default fallback behavior**

```ts
// src/repositories/store-access-settings-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db/database.types";

type StoreAccessRow = Tables<"tenant_store_access_settings">;

export const DEFAULT_CHECKOUT_LOCK_MESSAGE =
  "sorry we currently can not accept payments please message @realdealkickzsc on instagram the items you would like to purchase.";

export type StoreAccessSettings = {
  siteLockEnabled: boolean;
  siteUnlockAt: string | null;
  checkoutLockEnabled: boolean;
  checkoutLockMessage: string;
};

export class StoreAccessSettingsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getByTenant(tenantId: string): Promise<StoreAccessSettings> {
    const { data, error } = await this.supabase
      .from("tenant_store_access_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const row = data as StoreAccessRow | null;
    return {
      siteLockEnabled: row?.site_lock_enabled ?? false,
      siteUnlockAt: row?.site_unlock_at ?? null,
      checkoutLockEnabled: row?.checkout_lock_enabled ?? false,
      checkoutLockMessage:
        row?.checkout_lock_message?.trim() || DEFAULT_CHECKOUT_LOCK_MESSAGE,
    };
  }

  async upsert(
    tenantId: string,
    settings: StoreAccessSettings,
  ): Promise<StoreAccessSettings> {
    const { data, error } = await this.supabase
      .from("tenant_store_access_settings")
      .upsert(
        {
          tenant_id: tenantId,
          site_lock_enabled: settings.siteLockEnabled,
          site_unlock_at: settings.siteUnlockAt,
          checkout_lock_enabled: settings.checkoutLockEnabled,
          checkout_lock_message: settings.checkoutLockMessage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return {
      siteLockEnabled: data.site_lock_enabled,
      siteUnlockAt: data.site_unlock_at,
      checkoutLockEnabled: data.checkout_lock_enabled,
      checkoutLockMessage: data.checkout_lock_message,
    };
  }
}
```

- [ ] **Step 5: Add the service that computes lock-state semantics**

```ts
// src/services/store-access-settings-service.ts
import { StoreAccessSettingsRepository } from "@/repositories/store-access-settings-repo";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export class StoreAccessSettingsService {
  private readonly repo: StoreAccessSettingsRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.repo = new StoreAccessSettingsRepository(supabase);
  }

  async getSettings(tenantId: string) {
    return this.repo.getByTenant(tenantId);
  }

  async saveSettings(
    tenantId: string,
    input: {
      siteLockEnabled: boolean;
      siteUnlockAt: string | null;
      checkoutLockEnabled: boolean;
      checkoutLockMessage: string;
    },
  ) {
    return this.repo.upsert(tenantId, input);
  }

  isSiteLocked(
    settings: { siteLockEnabled: boolean; siteUnlockAt: string | null },
    now = new Date(),
  ) {
    if (!settings.siteLockEnabled) {
      return false;
    }

    if (!settings.siteUnlockAt) {
      return true;
    }

    const unlockAt = new Date(settings.siteUnlockAt);
    if (Number.isNaN(unlockAt.getTime())) {
      return true;
    }

    return now.getTime() < unlockAt.getTime();
  }

  isCheckoutLocked(settings: { checkoutLockEnabled: boolean }) {
    return settings.checkoutLockEnabled;
  }
}
```

- [ ] **Step 6: Run static verification**

Run: `npm run typecheck`

Expected: PASS with the new table/repository/service types compiling.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260515120000_store_access_settings.sql src/repositories/store-access-settings-repo.ts src/services/store-access-settings-service.ts src/types/db/database.types.ts
git commit -m "feat: add tenant store access settings"
```

### Task 2: Add Admin Settings API And UI

**Files:**
- Create: `app/api/admin/store-access/route.ts`
- Create: `app/admin/settings/store-access/page.tsx`
- Create: `src/components/admin/settings/StoreAccessSettingsPanel.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/lib/validation/admin.ts`

- [ ] **Step 1: Add the failing validation and route contract**

```ts
// Expected request body shape:
{
  siteLockEnabled: boolean;
  siteUnlockAt?: string | null;
  checkoutLockEnabled: boolean;
  checkoutLockMessage?: string;
}

// Expected GET response shape:
{
  settings: {
    siteLockEnabled: boolean;
    siteUnlockAt: string | null;
    checkoutLockEnabled: boolean;
    checkoutLockMessage: string;
  };
}
```

- [ ] **Step 2: Add the validation schema**

```ts
// src/lib/validation/admin.ts
export const storeAccessSettingsSchema = z
  .object({
    siteLockEnabled: z.boolean(),
    siteUnlockAt: z.string().datetime({ offset: true }).nullable().optional(),
    checkoutLockEnabled: z.boolean(),
    checkoutLockMessage: z.string().trim().min(1).max(500).optional(),
  })
  .strict();
```

- [ ] **Step 3: Add the admin API route**

```ts
// app/api/admin/store-access/route.ts
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { storeAccessSettingsSchema } from "@/lib/validation/admin";
import { StoreAccessSettingsService } from "@/services/store-access-settings-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(new Headers(request.headers));
  const session = await requireAdminApi();
  const supabase = await createSupabaseServerClient();
  const tenantId = await ensureTenantId(session, supabase);
  const service = new StoreAccessSettingsService(supabase);

  const settings = await service.getSettings(tenantId);
  return NextResponse.json({ settings, requestId }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(new Headers(request.headers));
  const session = await requireAdminApi();
  const supabase = await createSupabaseServerClient();
  const tenantId = await ensureTenantId(session, supabase);
  const service = new StoreAccessSettingsService(supabase);

  const body = await request.json().catch(() => null);
  const parsed = storeAccessSettingsSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.format(), requestId },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const settings = await service.saveSettings(tenantId, {
    siteLockEnabled: parsed.data.siteLockEnabled,
    siteUnlockAt: parsed.data.siteUnlockAt ?? null,
    checkoutLockEnabled: parsed.data.checkoutLockEnabled,
    checkoutLockMessage: parsed.data.checkoutLockMessage?.trim() || undefined,
  });

  return NextResponse.json({ settings, requestId }, { headers: { "Cache-Control": "no-store" } });
}
```

- [ ] **Step 4: Add the admin settings page and sidebar link**

```tsx
// app/admin/settings/store-access/page.tsx
"use client";

import { StoreAccessSettingsPanel } from "@/components/admin/settings/StoreAccessSettingsPanel";

export default function StoreAccessSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Store Access</h1>
        <p className="text-sm sm:text-base text-gray-400">
          Control the storefront lock screen and checkout availability.
        </p>
      </div>

      <StoreAccessSettingsPanel />
    </div>
  );
}
```

```ts
// src/components/admin/AdminSidebar.tsx children under Settings
children: [
  { href: "/admin/settings/store-access", label: "Store Access" },
  { href: "/admin/settings/shipping", label: "Shipping" },
  { href: "/admin/settings/taxes", label: "Taxes" },
  { href: "/admin/settings/transfers", label: "Bank" },
],
```

- [ ] **Step 5: Add the client panel with fetch/save state**

```tsx
// src/components/admin/settings/StoreAccessSettingsPanel.tsx
"use client";

import { useEffect, useState } from "react";

export function StoreAccessSettingsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [siteLockEnabled, setSiteLockEnabled] = useState(false);
  const [siteUnlockAt, setSiteUnlockAt] = useState("");
  const [checkoutLockEnabled, setCheckoutLockEnabled] = useState(false);
  const [checkoutLockMessage, setCheckoutLockMessage] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/admin/store-access", { cache: "no-store" });
      const data = await response.json();
      if (data.settings) {
        setSiteLockEnabled(Boolean(data.settings.siteLockEnabled));
        setSiteUnlockAt(data.settings.siteUnlockAt ? data.settings.siteUnlockAt.slice(0, 16) : "");
        setCheckoutLockEnabled(Boolean(data.settings.checkoutLockEnabled));
        setCheckoutLockMessage(data.settings.checkoutLockMessage ?? "");
      }
      setIsLoading(false);
    };

    void load();
  }, []);

  const save = async () => {
    setIsSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/store-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteLockEnabled,
        siteUnlockAt: siteUnlockAt ? new Date(siteUnlockAt).toISOString() : null,
        checkoutLockEnabled,
        checkoutLockMessage,
      }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Store access settings updated." : data.error ?? "Failed to save settings.");
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="text-sm text-zinc-400">Loading store access settings...</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded border border-zinc-800/70 bg-zinc-900 p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Site Lock</h2>
          <p className="text-sm text-zinc-400">
            Lock the public storefront until a specific date and time.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm text-white">
          <input
            type="checkbox"
            checked={siteLockEnabled}
            onChange={(event) => setSiteLockEnabled(event.target.checked)}
            className="rdk-checkbox"
          />
          Enable site lock
        </label>
        <div>
          <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">
            Unlock At
          </label>
          <input
            type="datetime-local"
            value={siteUnlockAt}
            onChange={(event) => setSiteUnlockAt(event.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800/70 px-3 py-2 text-white"
          />
        </div>
      </section>

      <section className="rounded border border-zinc-800/70 bg-zinc-900 p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Checkout Lock</h2>
          <p className="text-sm text-zinc-400">
            Keep the site open while showing a temporary payment-unavailable message.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm text-white">
          <input
            type="checkbox"
            checked={checkoutLockEnabled}
            onChange={(event) => setCheckoutLockEnabled(event.target.checked)}
            className="rdk-checkbox"
          />
          Enable checkout lock
        </label>
        <div>
          <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">
            Checkout Message
          </label>
          <textarea
            value={checkoutLockMessage}
            onChange={(event) => setCheckoutLockMessage(event.target.value)}
            rows={5}
            className="w-full bg-zinc-950 border border-zinc-800/70 px-3 py-2 text-white"
          />
        </div>
      </section>

      <div className="lg:col-span-2 flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-400">{message}</span>
        <button
          type="button"
          onClick={() => {
            void save();
          }}
          disabled={isSaving}
          className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-zinc-700"
        >
          {isSaving ? "Saving..." : "Save store access settings"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run verification for the settings API/UI slice**

Run: `npm run lint`

Expected: PASS with no new ESLint errors in the route/page/panel files.

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/store-access/route.ts app/admin/settings/store-access/page.tsx src/components/admin/settings/StoreAccessSettingsPanel.tsx src/components/admin/AdminSidebar.tsx src/lib/validation/admin.ts
git commit -m "feat: add store access admin settings"
```

### Task 3: Wire Proxy And Checkout Enforcement

**Files:**
- Create: `src/lib/store-access/get-store-access-settings.ts`
- Create: `src/components/checkout/CheckoutLockedNotice.tsx`
- Modify: `src/proxy/site-lock.ts`
- Modify: `app/locked/page.tsx`
- Modify: `app/locked/unlock-timer.tsx`
- Modify: `app/checkout/page.tsx`
- Modify: `app/checkout/start/page.tsx`
- Modify: `app/checkout/layout.tsx`

- [ ] **Step 1: Add a shared server helper for loading tenant settings**

```ts
// src/lib/store-access/get-store-access-settings.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantRepository } from "@/repositories/tenant-repo";
import { StoreAccessSettingsService } from "@/services/store-access-settings-service";

export async function getStoreAccessSettings() {
  const supabase = await createSupabaseServerClient();
  const tenantRepo = new TenantRepository(supabase);
  const tenantId = await tenantRepo.getFirstTenantId();

  if (!tenantId) {
    return null;
  }

  const service = new StoreAccessSettingsService(supabase);
  const settings = await service.getSettings(tenantId);
  return { tenantId, settings };
}
```

- [ ] **Step 2: Replace hardcoded proxy lock behavior**

```ts
// src/proxy/site-lock.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantRepository } from "@/repositories/tenant-repo";
import { StoreAccessSettingsService } from "@/services/store-access-settings-service";

async function getLockSettings() {
  const supabase = await createSupabaseServerClient();
  const tenantRepo = new TenantRepository(supabase);
  const tenantId = await tenantRepo.getFirstTenantId();
  if (!tenantId) {
    return null;
  }

  const service = new StoreAccessSettingsService(supabase);
  const settings = await service.getSettings(tenantId);
  return { service, settings };
}

export async function checkSiteLock(request: NextRequest, requestId: string) {
  const lockSettings = await getLockSettings();
  if (!lockSettings) {
    return null;
  }

  const { service, settings } = lockSettings;
  if (!service.isSiteLocked(settings)) {
    return null;
  }

  // keep existing allowlist + admin bypass logic
}
```

- [ ] **Step 3: Update the locked page to render from persisted settings and keep storefront styling**

```tsx
// app/locked/page.tsx
import { getStoreAccessSettings } from "@/lib/store-access/get-store-access-settings";

export default async function LockedPage(...) {
  const storeAccess = await getStoreAccessSettings();
  const unlockAtIso = storeAccess?.settings.siteUnlockAt ?? null;

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      {unlockAtIso ? <UnlockTimer unlockAtIso={unlockAtIso} /> : null}
      <div className="overflow-hidden rounded-3xl border border-zinc-800/70 bg-zinc-950 shadow-2xl">
        <div className="bg-[radial-gradient(120%_90%_at_50%_0%,rgba(220,38,38,0.32),transparent_60%),linear-gradient(to_bottom,rgba(0,0,0,0.98),rgba(0,0,0,0.94),rgba(220,38,38,0.12))] px-8 py-12 text-center sm:px-14">
          <p className="text-xs uppercase tracking-[0.24em] text-red-400">Store Locked</p>
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            We&apos;re not open yet
          </h1>
          <p className="mt-4 text-sm text-zinc-300 sm:text-base">
            The storefront will open automatically at the configured drop time.
          </p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add the checkout locked notice component**

```tsx
// src/components/checkout/CheckoutLockedNotice.tsx
export function CheckoutLockedNotice({ message }: { message: string }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-red-400">Checkout Locked</p>
        <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-white">
          Payments are temporarily unavailable
        </h1>
        <p className="mt-4 text-sm sm:text-base text-zinc-300">{message}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Enforce checkout lock in the shared checkout entrypoints**

```tsx
// app/checkout/page.tsx
import { getStoreAccessSettings } from "@/lib/store-access/get-store-access-settings";
import { CheckoutLockedNotice } from "@/components/checkout/CheckoutLockedNotice";

export default async function CheckoutGatePage() {
  const storeAccess = await getStoreAccessSettings();
  const checkoutLock = storeAccess?.settings.checkoutLockEnabled ?? false;

  if (checkoutLock) {
    return (
      <CheckoutLockedNotice
        message={storeAccess?.settings.checkoutLockMessage ?? ""}
      />
    );
  }

  // existing redirect logic
}
```

```tsx
// app/checkout/start/page.tsx
import { getStoreAccessSettings } from "@/lib/store-access/get-store-access-settings";
import { CheckoutLockedNotice } from "@/components/checkout/CheckoutLockedNotice";
import { CheckoutStart } from "@/components/checkout/CheckoutStart";

export default async function CheckoutStartPage() {
  const storeAccess = await getStoreAccessSettings();
  if (storeAccess?.settings.checkoutLockEnabled) {
    return (
      <CheckoutLockedNotice
        message={storeAccess.settings.checkoutLockMessage}
      />
    );
  }

  return <CheckoutStart />;
}
```

- [ ] **Step 6: Run end-to-end static verification**

Run: `npm run typecheck`

Expected: PASS with the proxy, page, and component changes compiling cleanly.

- [ ] **Step 7: Run final quality checks**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/store-access/get-store-access-settings.ts src/proxy/site-lock.ts app/locked/page.tsx app/locked/unlock-timer.tsx src/components/checkout/CheckoutLockedNotice.tsx app/checkout/page.tsx app/checkout/start/page.tsx app/checkout/layout.tsx
git commit -m "feat: enforce tenant-backed store and checkout locks"
```
