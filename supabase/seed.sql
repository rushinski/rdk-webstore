begin;

insert into public.tenants (name)
select 'Realdealkickzsc'
where not exists (
  select 1 from public.tenants where name = 'Realdealkickzsc'
);

insert into public.marketplaces (tenant_id, name)
select t.id, 'RDK Storefront'
from public.tenants t
where t.name = 'Realdealkickzsc'
  and not exists (
    select 1 from public.marketplaces m
    where m.tenant_id = t.id
      and m.name = 'RDK Storefront'
  );

-- Catalog seed data (global, tenant_id null)

-- Seed brand groups
insert into public.catalog_brand_groups (tenant_id, key, label)
values
  (null, 'nike', 'Nike'),
  (null, 'jordan', 'Jordan'),
  (null, 'new_balance', 'New Balance'),
  (null, 'asics', 'ASICS'),
  (null, 'yeezy', 'Yeezy'),
  (null, 'designer', 'Designer'),
  (null, 'other', 'Other');

-- Seed brands
insert into public.catalog_brands (tenant_id, group_id, canonical_label, is_active, is_verified)
values
  (null, (select id from public.catalog_brand_groups where key = 'nike' and tenant_id is null limit 1), 'Nike', true, true),
  (null, (select id from public.catalog_brand_groups where key = 'jordan' and tenant_id is null limit 1), 'Jordan', true, true),
  (null, (select id from public.catalog_brand_groups where key = 'new_balance' and tenant_id is null limit 1), 'New Balance', true, true),
  (null, (select id from public.catalog_brand_groups where key = 'asics' and tenant_id is null limit 1), 'ASICS', true, true),
  (null, (select id from public.catalog_brand_groups where key = 'yeezy' and tenant_id is null limit 1), 'Yeezy', true, true),
  (null, (select id from public.catalog_brand_groups where key = 'designer' and tenant_id is null limit 1), 'Louis Vuitton', true, true),
  (null, (select id from public.catalog_brand_groups where key = 'designer' and tenant_id is null limit 1), 'Rick Owens', true, true),
  (null, (select id from public.catalog_brand_groups where key = 'designer' and tenant_id is null limit 1), 'Prada', true, true),
  (null, (select id from public.catalog_brand_groups where key = 'designer' and tenant_id is null limit 1), 'Balenciaga', true, true),
  (null, (select id from public.catalog_brand_groups where key = 'designer' and tenant_id is null limit 1), 'Maison Mihara Yasuhiro', true, true),
  (null, (select id from public.catalog_brand_groups where key = 'designer' and tenant_id is null limit 1), 'Maison Margiela', true, true),
  (null, (select id from public.catalog_brand_groups where key = 'designer' and tenant_id is null limit 1), 'Marni', true, true),
  (null, (select id from public.catalog_brand_groups where key = 'designer' and tenant_id is null limit 1), 'Gucci', true, true);

-- Seed models (Nike)
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
values
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'Air Force 1', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'Dunk Low', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'Dunk High', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'SB Dunk Low', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'SB Dunk High', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'Air Max 1', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'Air Max 90', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'Air Max 95', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'Air Max 97', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'Air Max Plus', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'Blazer Mid', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'Cortez', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1), 'Vomero 5', true, true);

-- Seed models (New Balance)
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
values
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '550', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '530', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '574', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '327', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '2002R', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '1906R', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '9060', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '990v1', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '990v2', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '990v3', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '990v4', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '990v5', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '990v6', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '991', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '992', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), '993', true, true);

-- Seed models (ASICS)
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
values
  (null, (select id from public.catalog_brands where canonical_label = 'ASICS' and tenant_id is null limit 1), 'Gel-Kayano 14', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'ASICS' and tenant_id is null limit 1), 'GT-2160', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'ASICS' and tenant_id is null limit 1), 'Gel-1130', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'ASICS' and tenant_id is null limit 1), 'GEL-NYC', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'ASICS' and tenant_id is null limit 1), 'GEL-Lyte III', true, true);

-- Seed models (Yeezy)
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
values
  (null, (select id from public.catalog_brands where canonical_label = 'Yeezy' and tenant_id is null limit 1), '350', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Yeezy' and tenant_id is null limit 1), '350 V2', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Yeezy' and tenant_id is null limit 1), '380', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Yeezy' and tenant_id is null limit 1), '500', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Yeezy' and tenant_id is null limit 1), '700', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Yeezy' and tenant_id is null limit 1), '700 V2', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Yeezy' and tenant_id is null limit 1), '700 V3', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Yeezy' and tenant_id is null limit 1), 'Foam Runner', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Yeezy' and tenant_id is null limit 1), 'Slides', true, true);

-- Seed models (Designer)
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
values
  (null, (select id from public.catalog_brands where canonical_label = 'Louis Vuitton' and tenant_id is null limit 1), 'LV Trainer', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Louis Vuitton' and tenant_id is null limit 1), 'Run Away', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Louis Vuitton' and tenant_id is null limit 1), 'Time Out', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Louis Vuitton' and tenant_id is null limit 1), 'Archlight', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Balenciaga' and tenant_id is null limit 1), 'Triple S', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Balenciaga' and tenant_id is null limit 1), 'Track', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Balenciaga' and tenant_id is null limit 1), 'Runner', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Balenciaga' and tenant_id is null limit 1), 'Defender', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Balenciaga' and tenant_id is null limit 1), 'Bouncer', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Prada' and tenant_id is null limit 1), 'Cloudbust Thunder', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Prada' and tenant_id is null limit 1), 'Americas Cup', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Gucci' and tenant_id is null limit 1), 'Ace', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Gucci' and tenant_id is null limit 1), 'Screener', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Gucci' and tenant_id is null limit 1), 'Rhyton', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Gucci' and tenant_id is null limit 1), 'Tennis 1977', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Maison Margiela' and tenant_id is null limit 1), 'Replica', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Maison Margiela' and tenant_id is null limit 1), 'Tabi', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Maison Mihara Yasuhiro' and tenant_id is null limit 1), 'Hank', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Maison Mihara Yasuhiro' and tenant_id is null limit 1), 'Peterson', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Maison Mihara Yasuhiro' and tenant_id is null limit 1), 'Wayne', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Maison Mihara Yasuhiro' and tenant_id is null limit 1), 'Blakey', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Maison Mihara Yasuhiro' and tenant_id is null limit 1), 'Baker', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Maison Mihara Yasuhiro' and tenant_id is null limit 1), 'Parker', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Maison Mihara Yasuhiro' and tenant_id is null limit 1), 'Charles', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Rick Owens' and tenant_id is null limit 1), 'Ramones', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Rick Owens' and tenant_id is null limit 1), 'Geobasket', true, true),
  (null, (select id from public.catalog_brands where canonical_label = 'Marni' and tenant_id is null limit 1), 'Pablo', true, true);

-- Seed Jordan models (Air Jordan 1-40)
with jordan_numbers as (
  select * from (values
    (1, 'I'),
    (2, 'II'),
    (3, 'III'),
    (4, 'IV'),
    (5, 'V'),
    (6, 'VI'),
    (7, 'VII'),
    (8, 'VIII'),
    (9, 'IX'),
    (10, 'X'),
    (11, 'XI'),
    (12, 'XII'),
    (13, 'XIII'),
    (14, 'XIV'),
    (15, 'XV'),
    (16, 'XVI'),
    (17, 'XVII'),
    (18, 'XVIII'),
    (19, 'XIX'),
    (20, 'XX'),
    (21, 'XXI'),
    (22, 'XXII'),
    (23, 'XXIII'),
    (24, 'XXIV'),
    (25, 'XXV'),
    (26, 'XXVI'),
    (27, 'XXVII'),
    (28, 'XXVIII'),
    (29, 'XXIX'),
    (30, 'XXX'),
    (31, 'XXXI'),
    (32, 'XXXII'),
    (33, 'XXXIII'),
    (34, 'XXXIV'),
    (35, 'XXXV'),
    (36, 'XXXVI'),
    (37, 'XXXVII'),
    (38, 'XXXVIII'),
    (39, 'XXXIX'),
    (40, 'XL')
  ) as t(number_value, roman_value)
)
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  (select id from public.catalog_brands where canonical_label = 'Jordan' and tenant_id is null limit 1),
  concat('Air Jordan ', number_value),
  true,
  true
from jordan_numbers;

-- Brand aliases
insert into public.catalog_aliases (
  tenant_id, entity_type, brand_id, alias_label, alias_normalized, priority, is_active
)
values
  (null, 'brand', (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), 'NB', regexp_replace(lower('NB'), '[^a-z0-9]+', ' ', 'g'), 10, true),
  (null, 'brand', (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1), 'Newbalance', regexp_replace(lower('Newbalance'), '[^a-z0-9]+', ' ', 'g'), 5, true),
  (null, 'brand', (select id from public.catalog_brands where canonical_label = 'ASICS' and tenant_id is null limit 1), 'Ascis', regexp_replace(lower('Ascis'), '[^a-z0-9]+', ' ', 'g'), 1, true),
  (null, 'brand', (select id from public.catalog_brands where canonical_label = 'Maison Mihara Yasuhiro' and tenant_id is null limit 1), 'Maison Mihara', regexp_replace(lower('Maison Mihara'), '[^a-z0-9]+', ' ', 'g'), 5, true);

-- Model aliases
insert into public.catalog_aliases (
  tenant_id, entity_type, model_id, alias_label, alias_normalized, priority, is_active
)
values
  (null, 'model', (select id from public.catalog_models where canonical_label = 'Air Force 1' and tenant_id is null limit 1), 'AF1', regexp_replace(lower('AF1'), '[^a-z0-9]+', ' ', 'g'), 10, true),
  (null, 'model', (select id from public.catalog_models where canonical_label = 'Air Force 1' and tenant_id is null limit 1), 'Air Force One', regexp_replace(lower('Air Force One'), '[^a-z0-9]+', ' ', 'g'), 5, true),
  (null, 'model', (select id from public.catalog_models where canonical_label = 'Dunk Low' and tenant_id is null limit 1), 'Dunk', regexp_replace(lower('Dunk'), '[^a-z0-9]+', ' ', 'g'), 1, true),
  (null, 'model', (select id from public.catalog_models where canonical_label = 'SB Dunk Low' and tenant_id is null limit 1), 'SB Dunk', regexp_replace(lower('SB Dunk'), '[^a-z0-9]+', ' ', 'g'), 2, true),
  (null, 'model', (select id from public.catalog_models where canonical_label = 'Air Max Plus' and tenant_id is null limit 1), 'TN', regexp_replace(lower('TN'), '[^a-z0-9]+', ' ', 'g'), 5, true),
  (null, 'model', (select id from public.catalog_models where canonical_label = 'Blazer Mid' and tenant_id is null limit 1), 'Blazer', regexp_replace(lower('Blazer'), '[^a-z0-9]+', ' ', 'g'), 1, true),
  (null, 'model', (select id from public.catalog_models where canonical_label = 'Gel-Kayano 14' and tenant_id is null limit 1), 'Kayano 14', regexp_replace(lower('Kayano 14'), '[^a-z0-9]+', ' ', 'g'), 5, true),
  (null, 'model', (select id from public.catalog_models where canonical_label = 'Gel-Kayano 14' and tenant_id is null limit 1), 'GEL KAYANO 14', regexp_replace(lower('GEL KAYANO 14'), '[^a-z0-9]+', ' ', 'g'), 5, true),
  (null, 'model', (select id from public.catalog_models where canonical_label = '990v6' and tenant_id is null limit 1), '990 v6', regexp_replace(lower('990 v6'), '[^a-z0-9]+', ' ', 'g'), 2, true),
  (null, 'model', (select id from public.catalog_models where canonical_label = '350' and tenant_id is null limit 1), '350 V2', regexp_replace(lower('350 V2'), '[^a-z0-9]+', ' ', 'g'), 2, true);

-- Jordan aliases (AJ, Jordan, Roman)
with jordan_numbers as (
  select * from (values
    (1, 'I'),
    (2, 'II'),
    (3, 'III'),
    (4, 'IV'),
    (5, 'V'),
    (6, 'VI'),
    (7, 'VII'),
    (8, 'VIII'),
    (9, 'IX'),
    (10, 'X'),
    (11, 'XI'),
    (12, 'XII'),
    (13, 'XIII'),
    (14, 'XIV'),
    (15, 'XV'),
    (16, 'XVI'),
    (17, 'XVII'),
    (18, 'XVIII'),
    (19, 'XIX'),
    (20, 'XX'),
    (21, 'XXI'),
    (22, 'XXII'),
    (23, 'XXIII'),
    (24, 'XXIV'),
    (25, 'XXV'),
    (26, 'XXVI'),
    (27, 'XXVII'),
    (28, 'XXVIII'),
    (29, 'XXIX'),
    (30, 'XXX'),
    (31, 'XXXI'),
    (32, 'XXXII'),
    (33, 'XXXIII'),
    (34, 'XXXIV'),
    (35, 'XXXV'),
    (36, 'XXXVI'),
    (37, 'XXXVII'),
    (38, 'XXXVIII'),
    (39, 'XXXIX'),
    (40, 'XL')
  ) as t(number_value, roman_value)
), jordan_models as (
  select m.id as model_id, n.number_value, n.roman_value
  from public.catalog_models m
  join jordan_numbers n on m.canonical_label = concat('Air Jordan ', n.number_value)
  where m.tenant_id is null
)
insert into public.catalog_aliases (
  tenant_id, entity_type, model_id, alias_label, alias_normalized, priority, is_active
)
select
  null,
  'model',
  model_id,
  alias_label,
  regexp_replace(lower(alias_label), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from (
  select model_id, concat('Jordan ', number_value) as alias_label from jordan_models
  union all
  select model_id, concat('AJ', number_value) from jordan_models
  union all
  select model_id, concat('Air Jordan ', number_value) from jordan_models
  union all
  select model_id, cast(number_value as text) from jordan_models
  union all
  select model_id, concat('Jordan ', roman_value) from jordan_models
) aliases;

-- Catalog updates and additions

-- Air Jordan rename
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

-- Rick Owens brand
insert into public.catalog_brands (tenant_id, group_id, canonical_label, is_active, is_verified)
select
  null,
  groups.id,
  'Rick Owens',
  true,
  true
from public.catalog_brand_groups groups
where groups.key = 'designer' and groups.tenant_id is null
on conflict (tenant_id, canonical_label) do update
set group_id = excluded.group_id,
    is_active = true,
    is_verified = true;

-- Normalize Timberland naming
update public.catalog_brands
set canonical_label = 'Timberland'
where canonical_label = 'Timberlands'
  and tenant_id is null;

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

-- Normalize Valley -> Vale
update public.catalog_brands
set canonical_label = 'Vale'
where canonical_label = 'Valley'
  and tenant_id is null;

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

-- Vans, Palm Angels, Bravest Studios
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
