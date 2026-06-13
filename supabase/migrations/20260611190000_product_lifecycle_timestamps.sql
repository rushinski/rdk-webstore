alter table public.products
  add column if not exists product_created_at timestamptz,
  add column if not exists product_updated_at timestamptz;

update public.products
set
  product_created_at = coalesce(product_created_at, created_at, now()),
  product_updated_at = coalesce(product_updated_at, updated_at, created_at, now());

alter table public.products
  alter column product_created_at set default now(),
  alter column product_updated_at set default now(),
  alter column product_created_at set not null,
  alter column product_updated_at set not null;

create index if not exists idx_products_product_created_at
  on public.products (product_created_at desc);

create index if not exists idx_products_product_updated_at
  on public.products (product_updated_at desc);
