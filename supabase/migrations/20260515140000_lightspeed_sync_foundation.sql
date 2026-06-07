create table if not exists public.tenant_lightspeed_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  domain_prefix text null,
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

alter table public.tenant_lightspeed_settings enable row level security;
alter table public.lightspeed_product_links enable row level security;
alter table public.lightspeed_sync_runs enable row level security;
alter table public.lightspeed_sync_run_items enable row level security;
alter table public.lightspeed_webhook_events enable row level security;

drop policy if exists "Admins can manage lightspeed settings"
  on public.tenant_lightspeed_settings;
drop policy if exists "Admins can manage lightspeed product links"
  on public.lightspeed_product_links;
drop policy if exists "Admins can manage lightspeed sync runs"
  on public.lightspeed_sync_runs;
drop policy if exists "Admins can manage lightspeed sync run items"
  on public.lightspeed_sync_run_items;
drop policy if exists "Admins can manage lightspeed webhook events"
  on public.lightspeed_webhook_events;

create policy "Admins can manage lightspeed settings"
  on public.tenant_lightspeed_settings
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = tenant_lightspeed_settings.tenant_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = tenant_lightspeed_settings.tenant_id
    )
  );

create policy "Admins can manage lightspeed product links"
  on public.lightspeed_product_links
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = lightspeed_product_links.tenant_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = lightspeed_product_links.tenant_id
    )
  );

create policy "Admins can manage lightspeed sync runs"
  on public.lightspeed_sync_runs
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = lightspeed_sync_runs.tenant_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = lightspeed_sync_runs.tenant_id
    )
  );

create policy "Admins can manage lightspeed sync run items"
  on public.lightspeed_sync_run_items
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = lightspeed_sync_run_items.tenant_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = lightspeed_sync_run_items.tenant_id
    )
  );

create policy "Admins can manage lightspeed webhook events"
  on public.lightspeed_webhook_events
  for all
  using (
    tenant_id is not null
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = lightspeed_webhook_events.tenant_id
    )
  )
  with check (
    tenant_id is not null
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = lightspeed_webhook_events.tenant_id
    )
  );

grant all on public.tenant_lightspeed_settings to service_role;
grant all on public.lightspeed_product_links to service_role;
grant all on public.lightspeed_sync_runs to service_role;
grant all on public.lightspeed_sync_run_items to service_role;
grant all on public.lightspeed_webhook_events to service_role;

grant select, insert, update, delete on public.tenant_lightspeed_settings to authenticated;
grant select, insert, update, delete on public.lightspeed_product_links to authenticated;
grant select, insert, update, delete on public.lightspeed_sync_runs to authenticated;
grant select, insert, update, delete on public.lightspeed_sync_run_items to authenticated;
grant select, insert, update, delete on public.lightspeed_webhook_events to authenticated;
