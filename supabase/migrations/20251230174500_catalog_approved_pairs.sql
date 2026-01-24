begin;

-- Normalize Timberland naming
update public.catalog_brands
set canonical_label = 'Timberland'
where canonical_label = 'Timberlands'
  and tenant_id is null;

update public.products
set brand = 'Timberland'
where brand = 'Timberlands';

-- Catalog seed data moved to supabase/seed.sql.

-- Prefer DRKSHDW Ramones naming
update public.catalog_models
set canonical_label = 'DRKSHDW Ramones'
where canonical_label = 'Ramones'
  and brand_id = (
    select id from public.catalog_brands
    where canonical_label = 'Rick Owens' and tenant_id is null
    limit 1
  );

update public.products
set model = 'DRKSHDW Ramones'
where brand = 'Rick Owens'
  and model = 'Ramones';

-- Catalog seed data moved to supabase/seed.sql.

commit;
