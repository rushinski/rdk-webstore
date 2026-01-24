begin;

-- Catalog seed data moved to supabase/seed.sql.

-- Nike model updates
update public.catalog_models
set canonical_label = 'Blazer'
where canonical_label = 'Blazer Mid'
  and brand_id = (
    select id from public.catalog_brands
    where canonical_label = 'Nike' and tenant_id is null
    limit 1
  );

delete from public.catalog_models
where canonical_label = 'Cortez'
  and brand_id = (
    select id from public.catalog_brands
    where canonical_label = 'Nike' and tenant_id is null
    limit 1
  );

-- Catalog seed data moved to supabase/seed.sql.

commit;
