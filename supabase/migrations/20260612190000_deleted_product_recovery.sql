create table if not exists public.deleted_product_recovery (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid null,
  deleted_by_user_id uuid null references auth.users(id) on delete set null,
  deleted_at timestamptz not null default timezone('utc', now()),
  local_product_snapshot jsonb not null default '{}'::jsonb,
  lightspeed_product_snapshots jsonb not null default '[]'::jsonb,
  lightspeed_link_snapshots jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_deleted_product_recovery_tenant_deleted_at
  on public.deleted_product_recovery (tenant_id, deleted_at desc);

alter table public.deleted_product_recovery enable row level security;

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
        and profiles.tenant_id = deleted_product_recovery.tenant_id
    )
  );

grant all on public.deleted_product_recovery to service_role;
grant select, insert, update, delete on public.deleted_product_recovery to authenticated;
