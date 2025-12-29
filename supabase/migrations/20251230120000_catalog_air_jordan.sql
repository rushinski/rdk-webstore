begin;

update public.catalog_brand_groups
set label = 'Air Jordan'
where key = 'jordan' and tenant_id is null;

update public.catalog_brands
set canonical_label = 'Air Jordan'
where canonical_label = 'Jordan' and tenant_id is null;

insert into public.catalog_aliases (
  tenant_id,
  entity_type,
  brand_id,
  alias_label,
  alias_normalized,
  priority,
  is_active
)
select
  null,
  'brand',
  id,
  'Jordan',
  regexp_replace(lower('Jordan'), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from public.catalog_brands
where canonical_label = 'Air Jordan' and tenant_id is null
on conflict do nothing;

update public.products
set brand = 'Air Jordan'
where brand = 'Jordan';

commit;
