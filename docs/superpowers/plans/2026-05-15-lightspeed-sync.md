# Lightspeed Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bidirectional Lightspeed Retail X-Series integration that preserves the website’s product/variant model, enforces naming and SKU rules, supports webhook-driven and manual reconciliation flows, and lets admins preview and selectively apply sync changes with a chosen inventory source of truth.

**Architecture:** Add tenant-scoped Lightspeed integration settings, product/variant mapping tables, audit tables for sync runs and sync items, a Lightspeed API client, a normalization layer that translates between website and POS representations, webhook ingestion plus reconciliation services, and an admin preview/apply UI grouped by change type. Treat SKU as the sellable-unit identity and external IDs as the primary link for already-synced records.

**Tech Stack:** Next.js App Router, Supabase Postgres + RLS migrations, typed repositories/services, Zod, server routes, SES-backed email notifications, Jest/TypeScript/ESLint.

---

## File Structure

- Create: `supabase/migrations/20260515140000_lightspeed_sync_foundation.sql`
- Create: `src/config/constants/lightspeed.ts`
- Create: `src/lib/lightspeed/client.ts`
- Create: `src/lib/lightspeed/types.ts`
- Create: `src/repositories/lightspeed-settings-repo.ts`
- Create: `src/repositories/lightspeed-links-repo.ts`
- Create: `src/repositories/lightspeed-sync-runs-repo.ts`
- Create: `src/repositories/lightspeed-webhook-events-repo.ts`
- Create: `src/services/lightspeed-sku-service.ts`
- Create: `src/services/lightspeed-mapping-service.ts`
- Create: `src/services/lightspeed-sync-preview-service.ts`
- Create: `src/services/lightspeed-sync-apply-service.ts`
- Create: `src/services/lightspeed-webhook-service.ts`
- Create: `src/services/lightspeed-product-sync-service.ts`
- Create: `src/services/lightspeed-sale-sync-service.ts`
- Create: `src/services/lightspeed-sync-report-email-service.ts`
- Create: `app/api/admin/lightspeed/settings/route.ts`
- Create: `app/api/admin/lightspeed/sync/preview/route.ts`
- Create: `app/api/admin/lightspeed/sync/apply/route.ts`
- Create: `app/api/webhooks/lightspeed/route.ts`
- Create: `app/admin/settings/lightspeed/page.tsx`
- Create: `src/components/admin/settings/LightspeedSettingsPanel.tsx`
- Create: `src/components/admin/inventory/LightspeedSyncPanel.tsx`
- Modify: `src/lib/validation/product.ts`
- Modify: `src/services/product-service.ts`
- Modify: `app/api/admin/products/route.ts`
- Modify: `app/api/admin/products/[id]/route.ts`
- Modify: `app/admin/inventory/client.tsx`
- Modify: `src/components/inventory/ProductForm.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/types/db/database.types.ts`
- Modify: `.env.example`
- Modify: `src/config/env.ts`

### Task 1: Add Schema, Env, And Integration Settings

**Files:**
- Create: `supabase/migrations/20260515140000_lightspeed_sync_foundation.sql`
- Create: `src/config/constants/lightspeed.ts`
- Create: `src/repositories/lightspeed-settings-repo.ts`
- Create: `app/api/admin/lightspeed/settings/route.ts`
- Create: `app/admin/settings/lightspeed/page.tsx`
- Create: `src/components/admin/settings/LightspeedSettingsPanel.tsx`
- Modify: `.env.example`
- Modify: `src/config/env.ts`
- Modify: `src/types/db/database.types.ts`
- Modify: `src/components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Define the failing shape for persistence and settings**

```ts
// Required DB concepts:
// 1. tenant_lightspeed_settings
// 2. lightspeed_product_links
// 3. lightspeed_sync_runs
// 4. lightspeed_sync_run_items
// 5. lightspeed_webhook_events
//
// Required env:
// LIGHTSPEED_CLIENT_ID
// LIGHTSPEED_CLIENT_SECRET
// LIGHTSPEED_REDIRECT_URI
// LIGHTSPEED_WEBHOOK_SHARED_SECRET
```

- [ ] **Step 2: Add the migration for integration tables**

```sql
create table if not exists public.tenant_lightspeed_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  account_id text null,
  retailer_id text null,
  access_token text null,
  refresh_token text null,
  token_expires_at timestamptz null,
  webhook_secret text null,
  sync_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists tenant_lightspeed_settings_tenant_id_key
  on public.tenant_lightspeed_settings (tenant_id);

create table if not exists public.lightspeed_product_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid null references public.products(id) on delete cascade,
  variant_id uuid null references public.product_variants(id) on delete cascade,
  lightspeed_product_id text null,
  lightspeed_variant_id text null,
  lightspeed_inventory_item_id text null,
  external_sku text not null,
  sync_state text not null default 'linked',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists lightspeed_product_links_tenant_variant_key
  on public.lightspeed_product_links (tenant_id, variant_id);

create unique index if not exists lightspeed_product_links_tenant_external_sku_key
  on public.lightspeed_product_links (tenant_id, external_sku);

create table if not exists public.lightspeed_sync_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_of_truth text not null,
  status text not null default 'preview',
  started_by uuid null references auth.users(id),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz null
);

create table if not exists public.lightspeed_sync_run_items (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null references public.lightspeed_sync_runs(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  change_type text not null,
  action text not null,
  entity_type text not null,
  entity_key text not null,
  payload jsonb not null default '{}'::jsonb,
  approved boolean null,
  apply_status text null,
  failure_reason text null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lightspeed_webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references public.tenants(id) on delete cascade,
  event_id text not null,
  topic text not null,
  payload jsonb not null,
  processed_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists lightspeed_webhook_events_event_id_key
  on public.lightspeed_webhook_events (event_id);
```

- [ ] **Step 3: Add env validation and constants**

```ts
// src/config/env.ts additions
LIGHTSPEED_CLIENT_ID: z.string().min(1),
LIGHTSPEED_CLIENT_SECRET: z.string().min(1),
LIGHTSPEED_REDIRECT_URI: z.string().url(),
LIGHTSPEED_WEBHOOK_SHARED_SECRET: z.string().min(1),
```

```env
# .env.example additions
LIGHTSPEED_CLIENT_ID=
LIGHTSPEED_CLIENT_SECRET=
LIGHTSPEED_REDIRECT_URI=
LIGHTSPEED_WEBHOOK_SHARED_SECRET=
```

```ts
// src/config/constants/lightspeed.ts
export const LIGHTSPEED_CONDITION_MAP = {
  new: "new",
  used: "preowned",
} as const;

export const LIGHTSPEED_SYNC_SOURCE_OF_TRUTH = [
  "lightspeed_inventory",
  "website_inventory",
] as const;
```

- [ ] **Step 4: Add the settings repository and settings page route/panel**

```ts
// src/repositories/lightspeed-settings-repo.ts
export class LightspeedSettingsRepository {
  async getByTenant(tenantId: string) {
    return this.supabase
      .from("tenant_lightspeed_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
  }

  async upsert(
    tenantId: string,
    input: { syncEnabled: boolean; accountId?: string | null; retailerId?: string | null },
  ) {
    return this.supabase
      .from("tenant_lightspeed_settings")
      .upsert(
        {
          tenant_id: tenantId,
          sync_enabled: input.syncEnabled,
          account_id: input.accountId ?? null,
          retailer_id: input.retailerId ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      )
      .select("*")
      .single();
  }
}
```

```ts
// app/api/admin/lightspeed/settings/route.ts
// GET current settings, POST validated updates
```

```tsx
// src/components/admin/settings/LightspeedSettingsPanel.tsx
// fields: sync enabled, account/retailer IDs, connection status copy
```

- [ ] **Step 5: Run schema/type verification**

Run: `npm run gen:types:local`

Expected: `src/types/db/database.types.ts` includes the new Lightspeed tables.

- [ ] **Step 6: Run static checks**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260515140000_lightspeed_sync_foundation.sql src/config/constants/lightspeed.ts src/repositories/lightspeed-settings-repo.ts app/api/admin/lightspeed/settings/route.ts app/admin/settings/lightspeed/page.tsx src/components/admin/settings/LightspeedSettingsPanel.tsx src/components/admin/AdminSidebar.tsx .env.example src/config/env.ts src/types/db/database.types.ts
git commit -m "feat: add lightspeed sync schema and settings"
```

### Task 2: Fix SKU Generation And Mapping Rules

**Files:**
- Create: `src/services/lightspeed-sku-service.ts`
- Create: `src/services/lightspeed-mapping-service.ts`
- Modify: `src/lib/validation/product.ts`
- Modify: `src/services/product-service.ts`
- Modify: `src/components/inventory/ProductForm.tsx`

- [ ] **Step 1: Add the failing SKU rule and condition expectations**

```ts
// Required behavior:
// - Website-created SKUs follow C-BBB-MMM-SS-NN
// - Local condition values still accept "used" today, but POS output maps that to "preowned"
// - Imported nonconforming external SKUs remain valid as foreign identifiers
```

- [ ] **Step 2: Add the SKU generation service**

```ts
// src/services/lightspeed-sku-service.ts
export class LightspeedSkuService {
  buildSku(input: {
    conditionCode: string;
    brandCode: string;
    modelCode: string;
    sizeCode: string;
    sequence: number;
  }) {
    const sequence = String(input.sequence).padStart(2, "0");
    return `${input.conditionCode}-${input.brandCode}-${input.modelCode}-${input.sizeCode}-${sequence}`;
  }
}
```

- [ ] **Step 3: Add mapping helpers for names, conditions, and identifiers**

```ts
// src/services/lightspeed-mapping-service.ts
export class LightspeedMappingService {
  toLightspeedCondition(condition: "new" | "used") {
    return condition === "used" ? "preowned" : "new";
  }

  toWebsiteCondition(condition: string) {
    return condition.toLowerCase() === "preowned" ? "used" : "new";
  }

  buildLightspeedName(input: {
    titleDisplay: string;
    sku: string;
    condition: "new" | "used";
    sizeLabel: string;
    isUniqueUnit: boolean;
  }) {
    if (!input.isUniqueUnit) {
      return input.titleDisplay;
    }
    return `${input.titleDisplay} - ${input.sku}`;
  }

  cleanWebsiteName(rawName: string) {
    return rawName.replace(/\s+-\s+[A-Z]-[A-Z0-9-]+$/i, "").trim();
  }
}
```

- [ ] **Step 4: Replace ad hoc SKU creation in product service**

```ts
// src/services/product-service.ts
// Replace:
// const sku = this.generateSKU(parsed.brand.label);
//
// With:
// const skuService = new LightspeedSkuService();
// const sku = skuService.buildSku({
//   conditionCode,
//   brandCode,
//   modelCode,
//   sizeCode,
//   sequence,
// });
```

- [ ] **Step 5: Tighten validation and form handling**

```ts
// src/lib/validation/product.ts
const CONDITION_VALUES = ["new", "used"] as const;
// keep current website enum, but add comment that Lightspeed outbound maps "used" -> "preowned"
```

```tsx
// src/components/inventory/ProductForm.tsx
// add helper text near SKU-related UI:
// "Website-generated SKUs are assigned automatically using condition, brand, model, size, and sequence."
```

- [ ] **Step 6: Run verification**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/services/lightspeed-sku-service.ts src/services/lightspeed-mapping-service.ts src/services/product-service.ts src/lib/validation/product.ts src/components/inventory/ProductForm.tsx
git commit -m "feat: add lightspeed sku and mapping rules"
```

### Task 3: Add Lightspeed API Client And Outbound Product Sync

**Files:**
- Create: `src/lib/lightspeed/client.ts`
- Create: `src/lib/lightspeed/types.ts`
- Create: `src/repositories/lightspeed-links-repo.ts`
- Create: `src/services/lightspeed-product-sync-service.ts`
- Modify: `app/api/admin/products/route.ts`
- Modify: `app/api/admin/products/[id]/route.ts`

- [ ] **Step 1: Add the failing outbound sync contract**

```ts
// Required behavior:
// - local create/update prepares Lightspeed payloads
// - duplicate/conflicting SKU blocks website-origin push
// - linked records update by external ID first
```

- [ ] **Step 2: Add a minimal typed Lightspeed API client**

```ts
// src/lib/lightspeed/client.ts
export class LightspeedClient {
  constructor(private readonly accessToken: string) {}

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`https://api.lightspeedapp.com/API/V3/Account/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Lightspeed request failed: ${response.status}`);
    }

    return response;
  }

  async createProduct(payload: unknown) {
    const response = await this.request("Product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  async updateProduct(productId: string, payload: unknown) {
    const response = await this.request(`Product/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  async listProducts(page = 1) {
    const response = await this.request(`Product?page=${page}`);
    return response.json();
  }
}
```

- [ ] **Step 3: Add the external link repository**

```ts
// src/repositories/lightspeed-links-repo.ts
export class LightspeedLinksRepository {
  async getByVariantId(tenantId: string, variantId: string) {
    return this.supabase
      .from("lightspeed_product_links")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("variant_id", variantId)
      .maybeSingle();
  }

  async getByExternalSku(tenantId: string, externalSku: string) {
    return this.supabase
      .from("lightspeed_product_links")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("external_sku", externalSku)
      .maybeSingle();
  }

  async upsertLink(input: {
    tenantId: string;
    productId?: string | null;
    variantId?: string | null;
    externalSku: string;
    lightspeedProductId?: string | null;
    lightspeedVariantId?: string | null;
  }) {
    return this.supabase
      .from("lightspeed_product_links")
      .upsert(
        {
          tenant_id: input.tenantId,
          product_id: input.productId ?? null,
          variant_id: input.variantId ?? null,
          external_sku: input.externalSku,
          lightspeed_product_id: input.lightspeedProductId ?? null,
          lightspeed_variant_id: input.lightspeedVariantId ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,variant_id" },
      )
      .select("*")
      .single();
  }
}
```

- [ ] **Step 4: Add the outbound sync service**

```ts
// src/services/lightspeed-product-sync-service.ts
export class LightspeedProductSyncService {
  async syncWebsiteProduct(productId: string, options: { tenantId: string; source: "create" | "update"; }) {
    // 1. load product + variants + images
    // 2. validate duplicate/conflict state
    // 3. map to Lightspeed payload
    // 4. create/update product
    // 5. upload images separately
    // 6. persist external links
  }
}
```

- [ ] **Step 5: Invoke outbound sync after admin product create/update**

```ts
// app/api/admin/products/route.ts
// after local createProduct succeeds:
// const syncService = new LightspeedProductSyncService(supabase);
// await syncService.syncWebsiteProduct(product.id, { tenantId, source: "create" });
```

```ts
// app/api/admin/products/[id]/route.ts
// after local updateProduct succeeds:
// await syncService.syncWebsiteProduct(product.id, { tenantId, source: "update" });
```

- [ ] **Step 6: Run verification**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/lightspeed/client.ts src/lib/lightspeed/types.ts src/repositories/lightspeed-links-repo.ts src/services/lightspeed-product-sync-service.ts app/api/admin/products/route.ts app/api/admin/products/[id]/route.ts
git commit -m "feat: add outbound lightspeed product sync"
```

### Task 4: Add Webhook Ingestion And Reconciliation Services

**Files:**
- Create: `src/repositories/lightspeed-webhook-events-repo.ts`
- Create: `src/services/lightspeed-webhook-service.ts`
- Create: `src/services/lightspeed-sale-sync-service.ts`
- Create: `app/api/webhooks/lightspeed/route.ts`

- [ ] **Step 1: Add the failing webhook behaviors**

```ts
// Required behavior:
// - store every webhook event idempotently
// - process product.update, product.delete/product.archive equivalent, inventory.update, sale.update
// - update local inventory when Lightspeed is authoritative for that event path
```

- [ ] **Step 2: Add webhook event persistence**

```ts
// src/repositories/lightspeed-webhook-events-repo.ts
export class LightspeedWebhookEventsRepository {
  async createIfMissing(eventId: string, topic: string, payload: unknown) {
    return this.supabase
      .from("lightspeed_webhook_events")
      .upsert(
        { event_id: eventId, topic, payload },
        { onConflict: "event_id", ignoreDuplicates: true },
      )
      .select("*")
      .maybeSingle();
  }

  async markProcessed(eventId: string) {
    return this.supabase
      .from("lightspeed_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", eventId);
  }
}
```

- [ ] **Step 3: Add the webhook service**

```ts
// src/services/lightspeed-webhook-service.ts
export class LightspeedWebhookService {
  async processEvent(input: { eventId: string; topic: string; payload: unknown }) {
    switch (input.topic) {
      case "product.update":
        // map inbound product
        break;
      case "product.delete":
        // archive or delete the linked website product according to sync rules
        break;
      case "inventory.update":
        // map inbound stock
        break;
      case "sale.update":
        // decrement website stock
        break;
    }
  }
}
```

- [ ] **Step 4: Add the webhook route with signature verification**

```ts
// app/api/webhooks/lightspeed/route.ts
export async function POST(request: Request) {
  const rawBody = await request.text();
  // verify shared secret/signature
  // parse topic + event id headers
  // persist event
  // process idempotently
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run verification**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/repositories/lightspeed-webhook-events-repo.ts src/services/lightspeed-webhook-service.ts src/services/lightspeed-sale-sync-service.ts app/api/webhooks/lightspeed/route.ts
git commit -m "feat: add lightspeed webhook ingestion"
```

### Task 5: Add Preview-Only Manual Sync

**Files:**
- Create: `src/repositories/lightspeed-sync-runs-repo.ts`
- Create: `src/services/lightspeed-sync-preview-service.ts`
- Create: `app/api/admin/lightspeed/sync/preview/route.ts`
- Create: `src/components/admin/inventory/LightspeedSyncPanel.tsx`
- Modify: `app/admin/inventory/client.tsx`

- [ ] **Step 1: Add the failing preview behavior**

```ts
// Required behavior:
// - choose source of truth
// - compute grouped changes: added, modified, archived/deactivated/deleted-equivalent, conflicts, skipped
// - write preview rows to lightspeed_sync_runs + lightspeed_sync_run_items
// - include edit propagation and delete/archive propagation in both directions
```

- [ ] **Step 2: Add the preview repository**

```ts
// src/repositories/lightspeed-sync-runs-repo.ts
export class LightspeedSyncRunsRepository {
  async createRun(input: { tenantId: string; sourceOfTruth: string; status: "preview"; startedBy?: string | null; summary: Record<string, unknown>; }) {
    return this.supabase
      .from("lightspeed_sync_runs")
      .insert({
        tenant_id: input.tenantId,
        source_of_truth: input.sourceOfTruth,
        status: input.status,
        started_by: input.startedBy ?? null,
        summary: input.summary,
      })
      .select("*")
      .single();
  }

  async createRunItems(
    runId: string,
    items: Array<{ tenantId: string; changeType: string; action: string; entityType: string; entityKey: string; payload: Record<string, unknown> }>,
  ) {
    return this.supabase.from("lightspeed_sync_run_items").insert(
      items.map((item) => ({
        sync_run_id: runId,
        tenant_id: item.tenantId,
        change_type: item.changeType,
        action: item.action,
        entity_type: item.entityType,
        entity_key: item.entityKey,
        payload: item.payload,
      })),
    );
  }

  async listRunItems(runId: string) {
    return this.supabase
      .from("lightspeed_sync_run_items")
      .select("*")
      .eq("sync_run_id", runId)
      .order("change_type", { ascending: true });
  }
}
```

- [ ] **Step 3: Add the preview service**

```ts
// src/services/lightspeed-sync-preview-service.ts
export class LightspeedSyncPreviewService {
  async buildPreview(input: { tenantId: string; sourceOfTruth: "lightspeed_inventory" | "website_inventory"; startedBy?: string | null; }) {
    // compare website variants/products against lightspeed products/inventory
    // create proposed changes
    // group and persist
    return {
      syncRunId,
      groups: {
        added: [],
        modified: [],
        archived: [],
        conflicts: [],
        skipped: [],
      },
    };
  }
}
```

- [ ] **Step 4: Add the preview API and inventory panel UI**

```ts
// app/api/admin/lightspeed/sync/preview/route.ts
export async function POST(request: Request) {
  // parse sourceOfTruth
  // run preview service
  // return grouped changes
}
```

```tsx
// src/components/admin/inventory/LightspeedSyncPanel.tsx
// source-of-truth select
// preview button
// grouped change lists with accept/deny toggles
```

```tsx
// app/admin/inventory/client.tsx
// render <LightspeedSyncPanel /> above the inventory list
```

- [ ] **Step 5: Run verification**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/repositories/lightspeed-sync-runs-repo.ts src/services/lightspeed-sync-preview-service.ts app/api/admin/lightspeed/sync/preview/route.ts src/components/admin/inventory/LightspeedSyncPanel.tsx app/admin/inventory/client.tsx
git commit -m "feat: add lightspeed sync preview workflow"
```

### Task 6: Add Selective Apply, Reporting, And Failure Emailing

**Files:**
- Create: `src/services/lightspeed-sync-apply-service.ts`
- Create: `src/services/lightspeed-sync-report-email-service.ts`
- Create: `app/api/admin/lightspeed/sync/apply/route.ts`

- [ ] **Step 1: Add the failing apply behavior**

```ts
// Required behavior:
// - accept all / deny all / selective accept-deny
// - only approved items mutate data
// - rejected items remain logged
// - failures send admin email with product + reason
```

- [ ] **Step 2: Add the apply service**

```ts
// src/services/lightspeed-sync-apply-service.ts
export class LightspeedSyncApplyService {
  async applyRun(input: {
    tenantId: string;
    syncRunId: string;
    decisions: Array<{ itemId: string; approved: boolean }>;
  }) {
    // load run + items
    // apply only approved changes
    // update item apply_status / failure_reason
    // finalize run summary
  }
}
```

- [ ] **Step 3: Add reporting email service**

```ts
// src/services/lightspeed-sync-report-email-service.ts
export class LightspeedSyncReportEmailService {
  async sendFailure(input: {
    tenantId: string;
    productLabel: string;
    action: string;
    reason: string;
  }) {
    // resolve admin recipients
    // send concise failure email
  }
}
```

- [ ] **Step 4: Add the apply API route**

```ts
// app/api/admin/lightspeed/sync/apply/route.ts
export async function POST(request: Request) {
  // parse syncRunId + item decisions
  // call apply service
  // return updated summary
}
```

- [ ] **Step 5: Run final verification**

Run: `npm run lint`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/lightspeed-sync-apply-service.ts src/services/lightspeed-sync-report-email-service.ts app/api/admin/lightspeed/sync/apply/route.ts
git commit -m "feat: add lightspeed sync apply and reporting"
```
