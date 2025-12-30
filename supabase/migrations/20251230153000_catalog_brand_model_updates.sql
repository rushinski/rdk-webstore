begin;

-- Ensure "Other" brand group and brand exist
insert into public.catalog_brand_groups (tenant_id, key, label)
values (null, 'other', 'Other')
on conflict (tenant_id, key) do update
set label = excluded.label;

insert into public.catalog_brands (tenant_id, group_id, canonical_label, is_active, is_verified)
select
  null,
  groups.id,
  'Other',
  true,
  false
from public.catalog_brand_groups groups
where groups.key = 'other' and groups.tenant_id is null
on conflict (tenant_id, canonical_label) do update
set group_id = excluded.group_id,
    is_active = true;

-- Add or update brands
insert into public.catalog_brands (tenant_id, group_id, canonical_label, is_active, is_verified)
select
  null,
  groups.id,
  brand_label,
  true,
  true
from (
  values
    ('designer', 'Alexander McQueen'),
    ('designer', 'Off-White'),
    ('other', 'Timberlands'),
    ('other', 'Supreme'),
    ('other', 'Valley'),
    ('other', 'Godspeed'),
    ('other', 'GV Gallery'),
    ('other', 'Sp5der'),
    ('other', 'Chrome Hearts')
) as input(group_key, brand_label)
join public.catalog_brand_groups groups
  on groups.key = input.group_key and groups.tenant_id is null
on conflict (tenant_id, canonical_label) do update
set group_id = excluded.group_id,
    is_active = true;

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

insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  brand.id,
  model_label,
  true,
  input.input_is_verified
from (
  values
    ('Nike', 'P-6000', true),
    ('Nike', 'Foamposite', true),
    ('Nike', 'Kobe', true),
    ('Nike', 'Other Nike Models', false),
    ('Air Jordan', 'Other Air Jordan Models', false)
) as input(brand_label, model_label, input_is_verified)
join public.catalog_brands brand
  on brand.canonical_label = input.brand_label and brand.tenant_id is null
on conflict (tenant_id, brand_id, canonical_label) do update
set is_active = true,
    is_verified = excluded.is_verified;

-- Aliases for updated brands/models
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
  'Offwhite',
  regexp_replace(lower('Offwhite'), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from public.catalog_brands
where canonical_label = 'Off-White' and tenant_id is null
on conflict do nothing;

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
  'Off White',
  regexp_replace(lower('Off White'), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from public.catalog_brands
where canonical_label = 'Off-White' and tenant_id is null
on conflict do nothing;

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
  'Timberland',
  regexp_replace(lower('Timberland'), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from public.catalog_brands
where canonical_label = 'Timberlands' and tenant_id is null
on conflict do nothing;

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
  id,
  'Blazer Mid',
  regexp_replace(lower('Blazer Mid'), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from public.catalog_models
where canonical_label = 'Blazer'
  and brand_id = (
    select id from public.catalog_brands
    where canonical_label = 'Nike' and tenant_id is null
    limit 1
  )
on conflict do nothing;

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
  id,
  'Nike Kobe',
  regexp_replace(lower('Nike Kobe'), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from public.catalog_models
where canonical_label = 'Kobe'
  and brand_id = (
    select id from public.catalog_brands
    where canonical_label = 'Nike' and tenant_id is null
    limit 1
  )
on conflict do nothing;

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
  id,
  'Nike Foamposite',
  regexp_replace(lower('Nike Foamposite'), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from public.catalog_models
where canonical_label = 'Foamposite'
  and brand_id = (
    select id from public.catalog_brands
    where canonical_label = 'Nike' and tenant_id is null
    limit 1
  )
on conflict do nothing;

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
  id,
  'P6000',
  regexp_replace(lower('P6000'), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from public.catalog_models
where canonical_label = 'P-6000'
  and brand_id = (
    select id from public.catalog_brands
    where canonical_label = 'Nike' and tenant_id is null
    limit 1
  )
on conflict do nothing;

commit;
