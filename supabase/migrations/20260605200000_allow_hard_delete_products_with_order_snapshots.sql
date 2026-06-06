begin;

alter table public.order_items
  alter column product_id drop not null,
  alter column variant_id drop not null;

alter table public.order_items
  drop constraint if exists order_items_product_id_fkey;

alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id)
  references public.products(id)
  on delete set null;

alter table public.order_items
  drop constraint if exists order_items_variant_id_fkey;

alter table public.order_items
  add constraint order_items_variant_id_fkey
  foreign key (variant_id)
  references public.product_variants(id)
  on delete set null;

commit;
