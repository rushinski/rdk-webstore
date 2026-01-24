begin;

-- Normalize Valley -> Vale
update public.catalog_brands
set canonical_label = 'Vale'
where canonical_label = 'Valley'
  and tenant_id is null;

update public.products
set brand = 'Vale'
where brand = 'Valley';

update public.products
set name = replace(name, 'Valley', 'Vale'),
    title_raw = replace(title_raw, 'Valley', 'Vale'),
    title_display = replace(title_display, 'Valley', 'Vale')
where brand = 'Vale';

update public.products
set sku = 'SEED-VALE-TEE'
where sku = 'SEED-VALLEY-TEE';

-- Catalog seed data moved to supabase/seed.sql.

commit;
