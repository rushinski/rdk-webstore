begin;

truncate table public.product_tags restart identity cascade;
truncate table public.product_images restart identity cascade;
truncate table public.product_variants restart identity cascade;
truncate table public.products restart identity cascade;

drop policy if exists "Public can view images of active marketplace products"
  on public.product_images;
drop policy if exists "Public can view images of active products"
  on public.product_images;
drop policy if exists "Public can view product tags for active marketplace products"
  on public.product_tags;
drop policy if exists "Public can view product tags for active products"
  on public.product_tags;
drop policy if exists "Public can view variants of active marketplace products"
  on public.product_variants;
drop policy if exists "Public can view variants of active products"
  on public.product_variants;
drop policy if exists "Public can view active marketplace products"
  on public.products;
drop policy if exists "Public can view active products"
  on public.products;

alter table public.products
  drop constraint if exists products_marketplace_id_fkey,
  drop constraint if exists products_seller_id_fkey,
  drop constraint if exists products_created_by_fkey,
  drop constraint if exists products_tenant_sku_key,
  drop constraint if exists products_size_type_check,
  drop constraint if exists products_shipping_price_cents_check;

alter table public.product_variants
  drop constraint if exists product_variants_unique_per_size,
  drop constraint if exists product_variants_price_cents_check,
  drop constraint if exists product_variants_sale_price_cents_check,
  drop constraint if exists product_variants_cost_cents_check,
  drop constraint if exists product_variants_unit_cost_cents_check,
  drop constraint if exists product_variants_stock_check,
  drop constraint if exists product_variants_size_type_check,
  drop constraint if exists product_variants_tenant_id_fkey,
  drop constraint if exists product_variants_sku_nonempty_check,
  drop constraint if exists product_variants_tenant_sku_key;

drop index if exists public.products_tenant_sku_key;
drop index if exists public.idx_products_marketplace_id;
drop index if exists public.idx_products_seller_id;
drop index if exists public.idx_product_variants_product_sort_order;
drop index if exists public.idx_product_variants_tenant_sku;

alter table public.products
  drop column if exists sku,
  drop column if exists price,
  drop column if exists cost_cents,
  drop column if exists seller_id,
  drop column if exists marketplace_id,
  drop column if exists condition_note,
  drop column if exists created_by,
  drop column if exists parse_version,
  drop column if exists stripe_tax_code,
  drop column if exists title_raw,
  drop column if exists title_display,
  drop column if exists brand_is_verified,
  drop column if exists model_is_verified,
  drop column if exists parse_confidence,
  drop column if exists shipping_override_cents,
  drop column if exists default_shipping_price;

alter table public.products
  add column if not exists size_type text not null default 'none',
  add column if not exists shipping_price_cents integer null;

alter table public.products
  add constraint products_size_type_check
    check (
      size_type = any (
        array['shoe'::text, 'clothing'::text, 'custom'::text, 'none'::text]
      )
    ),
  add constraint products_shipping_price_cents_check
    check (shipping_price_cents is null or shipping_price_cents >= 0);

alter table public.product_variants
  drop column if exists size_type;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'price_cents'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'sale_price_cents'
  ) then
    alter table public.product_variants
      rename column price_cents to sale_price_cents;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'cost_cents'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'unit_cost_cents'
  ) then
    alter table public.product_variants
      rename column cost_cents to unit_cost_cents;
  end if;
end $$;

alter table public.product_variants
  add column if not exists tenant_id uuid,
  add column if not exists sku text,
  add column if not exists unit_cost_cents integer,
  add column if not exists created_at timestamp with time zone not null default now(),
  add column if not exists updated_at timestamp with time zone not null default now();

alter table public.product_variants
  alter column tenant_id set not null,
  alter column sku set not null,
  alter column sale_price_cents set not null,
  alter column unit_cost_cents set default 0,
  alter column unit_cost_cents set not null;

alter table public.product_variants
  add constraint product_variants_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  add constraint product_variants_sku_nonempty_check
    check (length(trim(sku)) > 0),
  add constraint product_variants_sale_price_cents_check
    check (sale_price_cents >= 0),
  add constraint product_variants_unit_cost_cents_check
    check (unit_cost_cents >= 0),
  add constraint product_variants_stock_check
    check (stock >= 0),
  add constraint product_variants_unique_per_size
    unique (product_id, size_label),
  add constraint product_variants_tenant_sku_key
    unique (tenant_id, sku);

create index if not exists idx_product_variants_tenant_sku
  on public.product_variants (tenant_id, sku);

create index if not exists idx_product_variants_product_sort_order
  on public.product_variants (product_id, sort_order);

create or replace function public.update_product_out_of_stock_status()
returns trigger as $$
declare
  product_id_to_check uuid;
  total_stock integer;
begin
  if (tg_op = 'DELETE') then
    product_id_to_check := old.product_id;
  else
    product_id_to_check := new.product_id;
  end if;

  if product_id_to_check is null then
    return null;
  end if;

  select coalesce(sum(stock), 0)
  into total_stock
  from public.product_variants
  where product_id = product_id_to_check;

  update public.products
  set is_out_of_stock = (total_stock <= 0)
  where id = product_id_to_check;

  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_product_variants_set_updated_at on public.product_variants;
create trigger trg_product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.rdk_set_updated_at();

create policy "Public can view images of active products"
  on public.product_images
  as permissive
  for select
  to public
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_images.product_id
        and p.is_active = true
    )
  );

create policy "Public can view product tags for active products"
  on public.product_tags
  as permissive
  for select
  to public
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_tags.product_id
        and p.is_active = true
    )
  );

create policy "Public can view variants of active products"
  on public.product_variants
  as permissive
  for select
  to public
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_variants.product_id
        and p.is_active = true
    )
  );

create policy "Public can view active products"
  on public.products
  as permissive
  for select
  to public
  using (is_active = true);

commit;
