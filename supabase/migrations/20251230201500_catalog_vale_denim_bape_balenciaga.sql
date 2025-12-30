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

-- Ensure Vale, Denim Tears, Bape, and Balenciaga are available
insert into public.catalog_brands (tenant_id, group_id, canonical_label, is_active, is_verified)
select
  null,
  groups.id,
  input.brand_label,
  true,
  true
from (
  values
    ('other', 'Vale'),
    ('other', 'Denim Tears'),
    ('other', 'Bape'),
    ('designer', 'Balenciaga')
) as input(group_key, brand_label)
join public.catalog_brand_groups groups
  on groups.key = input.group_key and groups.tenant_id is null
on conflict (tenant_id, canonical_label) do update
set group_id = excluded.group_id,
    is_active = true,
    is_verified = true;

-- Ensure Balenciaga models are active
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  brand.id,
  input.model_label,
  true,
  true
from (
  values
    ('Track'),
    ('Runner'),
    ('Triple S')
) as input(model_label)
join public.catalog_brands brand
  on brand.canonical_label = 'Balenciaga' and brand.tenant_id is null
on conflict (tenant_id, brand_id, canonical_label) do update
set is_active = true,
    is_verified = true;

-- Aliases for Vale and Bape
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
  brand.id,
  input.alias_label,
  regexp_replace(lower(input.alias_label), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from (
  values
    ('Vale', 'Valley'),
    ('Bape', 'BAPE'),
    ('Bape', 'A Bathing Ape')
) as input(brand_label, alias_label)
join public.catalog_brands brand
  on brand.canonical_label = input.brand_label and brand.tenant_id is null
on conflict do nothing;

commit;
