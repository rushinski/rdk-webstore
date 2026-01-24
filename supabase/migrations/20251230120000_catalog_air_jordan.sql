begin;

update public.catalog_brand_groups
set label = 'Air Jordan'
where key = 'jordan' and tenant_id is null;

update public.catalog_brands
set canonical_label = 'Air Jordan'
where canonical_label = 'Jordan' and tenant_id is null;

-- Catalog seed data moved to supabase/seed.sql.

update public.products
set brand = 'Air Jordan'
where brand = 'Jordan';

commit;
