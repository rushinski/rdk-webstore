begin;

-- Normalize Timberland naming
update public.catalog_brands
set canonical_label = 'Timberland'
where canonical_label = 'Timberlands'
  and tenant_id is null;

update public.products
set brand = 'Timberland'
where brand = 'Timberlands';

-- Ensure approved brands exist under Designer/Other groups
insert into public.catalog_brands (tenant_id, group_id, canonical_label, is_active, is_verified)
select
  null,
  groups.id,
  input.brand_label,
  true,
  true
from (
  values
    ('designer', 'Rick Owens'),
    ('designer', 'Off-White'),
    ('designer', 'Alexander McQueen'),
    ('other', 'Timberland')
) as input(group_key, brand_label)
join public.catalog_brand_groups groups
  on groups.key = input.group_key and groups.tenant_id is null
on conflict (tenant_id, canonical_label) do update
set group_id = excluded.group_id,
    is_active = true,
    is_verified = true;

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

-- Approved models
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  brand.id,
  input.model_label,
  true,
  true
from (
  values
    ('Rick Owens', 'DRKSHDW Ramones'),
    ('Rick Owens', 'Geobasket'),
    ('Rick Owens', 'Geth Runner'),
    ('Off-White', 'Out Of Office (OOO)'),
    ('Off-White', 'Be Right Back'),
    ('Off-White', 'Vulcanized'),
    ('Off-White', 'ODSY-1000'),
    ('Alexander McQueen', 'Oversized Sneaker'),
    ('Timberland', 'Premium 6-Inch Waterproof Boot'),
    ('Timberland', 'Authentic 3-Eye Lug Boat Shoe'),
    ('Timberland', 'Field Boot'),
    ('Timberland', 'Euro Hiker')
) as input(brand_label, model_label)
join public.catalog_brands brand
  on brand.canonical_label = input.brand_label and brand.tenant_id is null
on conflict (tenant_id, brand_id, canonical_label) do update
set is_active = true,
    is_verified = true;

-- Aliases for brand spelling variants
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
  input.alias_label,
  regexp_replace(lower(input.alias_label), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from (
  values
    ('Rick Owens', 'Rich Owens'),
    ('Timberland', 'Timberlands')
) as input(brand_label, alias_label)
join public.catalog_brands brand
  on brand.canonical_label = input.brand_label and brand.tenant_id is null
on conflict do nothing;

-- Aliases for Off-White OOO
insert into public.catalog_aliases (
  tenant_id,
  entity_type,
  model_id,
  alias_label,
  alias_normalized,
  priority,
  is_active
)
select
  null,
  'model',
  model.id,
  input.alias_label,
  regexp_replace(lower(input.alias_label), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from (
  values
    ('Out Of Office (OOO)', 'Out Of Office'),
    ('Out Of Office (OOO)', 'OOO'),
    ('DRKSHDW Ramones', 'Ramones')
) as input(model_label, alias_label)
join public.catalog_models model
  on model.canonical_label = input.model_label
join public.catalog_brands brand
  on brand.id = model.brand_id and brand.tenant_id is null
on conflict do nothing;

commit;
