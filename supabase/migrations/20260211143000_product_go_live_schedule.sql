alter table public.products
  add column if not exists go_live_at timestamp with time zone;

update public.products
set go_live_at = coalesce(go_live_at, created_at, now())
where go_live_at is null;

alter table public.products
  alter column go_live_at set default now();

alter table public.products
  alter column go_live_at set not null;

comment on column public.products.go_live_at is
  'UTC timestamp when the product becomes visible to customers. Defaults to immediate publish.';

create index if not exists idx_products_go_live_at
  on public.products(go_live_at);

-- Keep public reads aligned with scheduled publishing.
drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products"
  on public.products
  as permissive
  for select
  to public
  using ((is_active = true) and (go_live_at <= now()));

drop policy if exists "Public can view images of active products" on public.product_images;
create policy "Public can view images of active products"
  on public.product_images
  as permissive
  for select
  to public
  using (
    exists (
      select 1
      from public.products
      where products.id = product_images.product_id
        and products.is_active = true
        and products.go_live_at <= now()
    )
  );

drop policy if exists "Public can view variants of active products" on public.product_variants;
create policy "Public can view variants of active products"
  on public.product_variants
  as permissive
  for select
  to public
  using (
    exists (
      select 1
      from public.products
      where products.id = product_variants.product_id
        and products.is_active = true
        and products.go_live_at <= now()
    )
  );