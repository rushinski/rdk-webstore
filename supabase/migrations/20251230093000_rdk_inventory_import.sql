create table if not exists public.inventory_imports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid null references public.profiles(id) on delete set null,
  source text not null,
  checksum text not null,
  file_name text not null,
  file_size integer not null,
  dry_run boolean not null default false,
  status text not null default 'completed',
  rows_parsed integer not null default 0,
  rows_upserted integer not null default 0,
  rows_failed integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists inventory_imports_tenant_checksum_idx
  on public.inventory_imports(tenant_id, checksum);

create table if not exists public.inventory_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.inventory_imports(id) on delete cascade,
  sheet_name text not null,
  row_number integer not null,
  token text null,
  reference_handle text null,
  status text not null,
  error text null,
  raw_row jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_import_rows_import_id_idx
  on public.inventory_import_rows(import_id);

create table if not exists public.inventory_external_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  token text not null,
  reference_handle text null,
  item_name text null,
  variation_name text null,
  sku text null,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  last_import_id uuid null references public.inventory_imports(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inventory_external_variants_tenant_token_idx
  on public.inventory_external_variants(tenant_id, token);

alter table public.inventory_imports enable row level security;
alter table public.inventory_import_rows enable row level security;
alter table public.inventory_external_variants enable row level security;

create policy "Admins can manage inventory imports"
  on public.inventory_imports
  as permissive
  for all
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

create policy "Admins can manage inventory import rows"
  on public.inventory_import_rows
  as permissive
  for all
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

create policy "Admins can manage inventory external variants"
  on public.inventory_external_variants
  as permissive
  for all
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));
