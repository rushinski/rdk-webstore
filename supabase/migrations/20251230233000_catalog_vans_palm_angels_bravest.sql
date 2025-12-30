begin;

insert into public.catalog_brands (tenant_id, group_id, canonical_label, is_active, is_verified)
select
  null,
  groups.id,
  brand_label,
  true,
  true
from (
  values
    ('other', 'Vans'),
    ('designer', 'Palm Angels'),
    ('other', 'Bravest Studios')
) as input(group_key, brand_label)
join public.catalog_brand_groups groups
  on groups.key = input.group_key and groups.tenant_id is null
on conflict (tenant_id, canonical_label) do update
set group_id = excluded.group_id,
    is_active = true;

insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  brand.id,
  model_label,
  true,
  true
from (
  values
    ('Vans', 'Old Skool'),
    ('Bravest Studios', 'Bear Claw')
) as input(brand_label, model_label)
join public.catalog_brands brand
  on brand.canonical_label = input.brand_label and brand.tenant_id is null
on conflict (tenant_id, brand_id, canonical_label) do update
set is_active = true,
    is_verified = true;

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
  'Palm Angel',
  regexp_replace(lower('Palm Angel'), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from public.catalog_brands
where canonical_label = 'Palm Angels' and tenant_id is null
on conflict do nothing;

commit;
