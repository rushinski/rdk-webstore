begin;

alter table public.lightspeed_product_links
  drop constraint if exists lightspeed_product_links_product_id_fkey;

alter table public.lightspeed_product_links
  add constraint lightspeed_product_links_product_id_fkey
  foreign key (product_id)
  references public.products(id)
  on delete set null;

alter table public.lightspeed_product_links
  drop constraint if exists lightspeed_product_links_variant_id_fkey;

alter table public.lightspeed_product_links
  add constraint lightspeed_product_links_variant_id_fkey
  foreign key (variant_id)
  references public.product_variants(id)
  on delete set null;

commit;
