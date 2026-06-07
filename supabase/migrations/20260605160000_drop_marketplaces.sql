begin;

alter table public.orders
  drop constraint if exists orders_marketplace_id_fkey;

alter table public.orders
  drop column if exists marketplace_id;

drop table if exists public.marketplaces;

commit;
