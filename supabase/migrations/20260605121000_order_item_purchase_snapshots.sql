begin;

alter table public.order_items
  add column if not exists variant_sku text,
  add column if not exists product_name text,
  add column if not exists brand text,
  add column if not exists model text,
  add column if not exists category text,
  add column if not exists condition text,
  add column if not exists size_label text;

commit;
