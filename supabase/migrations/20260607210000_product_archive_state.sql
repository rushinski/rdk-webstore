alter table public.products
  add column if not exists archived_at timestamptz null;

create index if not exists idx_products_archived_at
  on public.products(archived_at);

create index if not exists idx_products_tenant_archived_at
  on public.products(tenant_id, archived_at);
