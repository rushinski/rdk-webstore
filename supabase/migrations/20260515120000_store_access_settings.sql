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

drop policy if exists "Admins can manage store access settings"
  on public.tenant_store_access_settings;

create policy "Admins can manage store access settings"
  on public.tenant_store_access_settings
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = tenant_store_access_settings.tenant_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
        and profiles.tenant_id = tenant_store_access_settings.tenant_id
    )
  );

grant all on public.tenant_store_access_settings to service_role;
grant select, insert, update on public.tenant_store_access_settings to authenticated;
