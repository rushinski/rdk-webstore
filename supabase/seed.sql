begin;

-- Create tenants and marketplaces
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

-- ============================================================================
-- CLEAR EXISTING CATALOG DATA
-- ============================================================================
DELETE FROM catalog_aliases;
DELETE FROM catalog_models;
DELETE FROM catalog_brands;
DELETE FROM catalog_brand_groups;

-- ============================================================================
-- CATALOG SEED DATA (global, tenant_id null)
-- ============================================================================

-- Single brand group for all brands
insert into public.catalog_brand_groups (tenant_id, key, label)
values (null, 'all_brands', 'All Brands');

-- ============================================================================
-- SEED BRANDS
-- ============================================================================
insert into public.catalog_brands (tenant_id, group_id, canonical_label, is_active, is_verified)
select
  null,
  (select id from public.catalog_brand_groups where key = 'all_brands' and tenant_id is null limit 1),
  brand_label,
  true,
  true
from (
  values
    ('Air Jordan'),
    ('Nike'),
    ('New Balance'),
    ('ASICS'),
    ('Adidas'),
    ('Vans'),
    ('Louis Vuitton'),
    ('Rick Owens'),
    ('Prada'),
    ('Balenciaga'),
    ('Maison Mihara Yasuhiro'),
    ('Maison Margiela'),
    ('Marni'),
    ('Gucci'),
    ('Alexander McQueen'),
    ('Off-White'),
    ('Palm Angels'),
    ('Timberland'),
    ('Supreme'),
    ('Sp5der'),
    ('Vale'),
    ('Chrome Hearts'),
    ('Godspeed'),
    ('GV Gallery'),
    ('Denim Tears'),
    ('A Bathing Ape'),
    ('Bravest Studios'),
    ('Dior'),
    ('Amiri'),
    ('Gallery Dept.'),
    ('Other')
) as input(brand_label);

-- Set "Other" brand to unverified
update public.catalog_brands
set is_verified = false
where canonical_label = 'Other' and tenant_id is null;

-- ============================================================================
-- SEED MODELS
-- ============================================================================

-- Nike Models
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  (select id from public.catalog_brands where canonical_label = 'Nike' and tenant_id is null limit 1),
  model_label,
  true,
  true
from (
  values
    ('Air Force 1'),
    ('Dunk Low'),
    ('SB Dunk Low'),
    ('SB Dunk High'),
    ('Air Max 1'),
    ('Air Max 97'),
    ('Air Max Plus'),
    ('Blazer'),
    ('Vomero 5'),
    ('P-6000'),
    ('Kobe'),
    ('Air Foamposite'),
    ('KD'),
    ('LeBron')
) as input(model_label);

-- Air Jordan Models (1-40)
with jordan_numbers as (
  select generate_series(1, 40) as number_value
)
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  (select id from public.catalog_brands where canonical_label = 'Air Jordan' and tenant_id is null limit 1),
  number_value::text,
  true,
  true
from jordan_numbers;

-- New Balance Models
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  (select id from public.catalog_brands where canonical_label = 'New Balance' and tenant_id is null limit 1),
  model_label,
  true,
  true
from (
  values
    ('327'),
    ('550'),
    ('990v6'),
    ('990v3'),
    ('991'),
    ('1906R'),
    ('9060')
) as input(model_label);

-- ASICS Models (with capital GEL)
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  (select id from public.catalog_brands where canonical_label = 'ASICS' and tenant_id is null limit 1),
  model_label,
  true,
  true
from (
  values
    ('GEL-Lyte III'),
    ('GEL-1130'),
    ('GT-2160'),
    ('GEL-Kayano 14'),
    ('GEL-DS Trainer'),
    ('GEL-NYC'),
    ('GEL-K1011')
) as input(model_label);

-- Adidas Models (Yeezy line)
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  (select id from public.catalog_brands where canonical_label = 'Adidas' and tenant_id is null limit 1),
  model_label,
  true,
  true
from (
  values
    ('Yeezy 350'),
    ('Yeezy 380'),
    ('Yeezy 500'),
    ('Yeezy 700'),
    ('Yeezy 700 V2'),
    ('Yeezy 700 V3'),
    ('Yeezy Foam Runner'),
    ('Yeezy Desert Boot')
) as input(model_label);

-- Designer Brand Models
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  brand.id,
  input.model_label,
  true,
  true
from (
  values
    ('Gucci', 'Ace'),
    ('Gucci', 'Rhyton'),
    ('Gucci', 'Tennis 1977'),
    ('Balenciaga', 'Triple S'),
    ('Balenciaga', 'Runner'),
    ('Balenciaga', 'Defender'),
    ('Balenciaga', '3XL'),
    ('Balenciaga', 'Track'),
    ('Prada', 'Cloudbust Thunder'),
    ('Prada', 'Americas Cup'),
    ('Rick Owens', 'Geobasket'),
    ('Rick Owens', 'Geth Runner'),
    ('Maison Margiela', 'Replica'),
    ('Louis Vuitton', 'Run Away'),
    ('Louis Vuitton', 'Trainer'),
    ('Louis Vuitton', 'Skate'),
    ('Off-White', 'Vulcanized'),
    ('Off-White', 'Out Of Office'),
    ('Maison Mihara Yasuhiro', 'Wayne'),
    ('Maison Mihara Yasuhiro', 'Parker'),
    ('Maison Mihara Yasuhiro', 'Peterson'),
    ('Maison Mihara Yasuhiro', 'Charles'),
    ('Maison Mihara Yasuhiro', 'Hank'),
    ('Maison Mihara Yasuhiro', 'Baker'),
    ('Marni', 'Pablo'),
    ('Alexander McQueen', 'Oversized'),
    ('Dior', 'B22'),
    ('Dior', 'B23'),
    ('Amiri', 'Skel'),
    ('Amiri', 'Classic'),
    ('Amiri', 'Arigato')
) as input(brand_label, model_label)
join public.catalog_brands brand
  on brand.canonical_label = input.brand_label and brand.tenant_id is null;

-- Timberland Models
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  (select id from public.catalog_brands where canonical_label = 'Timberland' and tenant_id is null limit 1),
  model_label,
  true,
  true
from (
  values
    ('Premium 6-Inch Waterproof Boot'),
    ('Euro Hiker'),
    ('Field Boot'),
    ('Authentic 3-Eye Lug Boat Shoe')
) as input(model_label);

-- Other Brand Models
insert into public.catalog_models (tenant_id, brand_id, canonical_label, is_active, is_verified)
select
  null,
  brand.id,
  input.model_label,
  true,
  true
from (
  values
    ('Bravest Studios', 'Claw Mules'),
    ('Vans', 'Old Skool'),
    ('Palm Angels', 'Ramones'),
    ('A Bathing Ape', 'BAPE STA')
) as input(brand_label, model_label)
join public.catalog_brands brand
  on brand.canonical_label = input.brand_label and brand.tenant_id is null;

-- ============================================================================
-- BRAND ALIASES
-- ============================================================================
insert into public.catalog_aliases (
  tenant_id, entity_type, brand_id, alias_label, alias_normalized, priority, is_active
)
select
  null,
  'brand',
  brand.id,
  input.alias_label,
  regexp_replace(lower(input.alias_label), '[^a-z0-9]+', ' ', 'g'),
  input.priority,
  true
from (
  values
    ('New Balance', 'NB', 10),
    ('Air Jordan', 'Jordan', 1),
    ('Maison Mihara Yasuhiro', 'Maison Mihara', 5),
    ('Rick Owens', 'Rich Owens', 1),
    ('Timberland', 'Timberlands', 1)
) as input(brand_label, alias_label, priority)
join public.catalog_brands brand
  on brand.canonical_label = input.brand_label and brand.tenant_id is null;

-- ============================================================================
-- MODEL ALIASES
-- ============================================================================

-- Nike Model Aliases
insert into public.catalog_aliases (
  tenant_id, entity_type, model_id, alias_label, alias_normalized, priority, is_active
)
select
  null,
  'model',
  model.id,
  input.alias_label,
  regexp_replace(lower(input.alias_label), '[^a-z0-9]+', ' ', 'g'),
  input.priority,
  true
from (
  values
    ('Air Force 1', 'AF1', 10),
    ('Air Force 1', 'Air Force One', 5),
    ('Dunk Low', 'Dunk', 1),
    ('P-6000', 'P6000', 1),
    ('Kobe', 'Nike Kobe', 1),
    ('Air Foamposite', 'Foamposite', 1)
) as input(model_label, alias_label, priority)
join public.catalog_models model on model.canonical_label = input.model_label and model.tenant_id is null
join public.catalog_brands brand on brand.id = model.brand_id and brand.canonical_label = 'Nike';

-- New Balance Model Aliases
insert into public.catalog_aliases (
  tenant_id, entity_type, model_id, alias_label, alias_normalized, priority, is_active
)
select
  null,
  'model',
  model.id,
  '990 v6',
  regexp_replace(lower('990 v6'), '[^a-z0-9]+', ' ', 'g'),
  2,
  true
from public.catalog_models model
join public.catalog_brands brand on brand.id = model.brand_id and brand.canonical_label = 'New Balance'
where model.canonical_label = '990v6' and model.tenant_id is null;

-- ASICS Model Aliases
insert into public.catalog_aliases (
  tenant_id, entity_type, model_id, alias_label, alias_normalized, priority, is_active
)
select
  null,
  'model',
  model.id,
  input.alias_label,
  regexp_replace(lower(input.alias_label), '[^a-z0-9]+', ' ', 'g'),
  5,
  true
from (
  values
    ('GEL-Kayano 14', 'Kayano 14'),
    ('GEL-Kayano 14', 'Gel Kayano 14')
) as input(model_label, alias_label)
join public.catalog_models model on model.canonical_label = input.model_label and model.tenant_id is null
join public.catalog_brands brand on brand.id = model.brand_id and brand.canonical_label = 'ASICS';

-- Air Jordan Aliases (numeric, "Jordan X", "Air Jordan X", "AJX")
with jordan_numbers as (
  select generate_series(1, 40) as num
),
roman_numerals as (
  select * from (values
    (1, 'I'), (2, 'II'), (3, 'III'), (4, 'IV'), (5, 'V'),
    (6, 'VI'), (7, 'VII'), (8, 'VIII'), (9, 'IX'), (10, 'X'),
    (11, 'XI'), (12, 'XII'), (13, 'XIII'), (14, 'XIV'), (15, 'XV'),
    (16, 'XVI'), (17, 'XVII'), (18, 'XVIII'), (19, 'XIX'), (20, 'XX'),
    (21, 'XXI'), (22, 'XXII'), (23, 'XXIII'), (24, 'XXIV'), (25, 'XXV'),
    (26, 'XXVI'), (27, 'XXVII'), (28, 'XXVIII'), (29, 'XXIX'), (30, 'XXX'),
    (31, 'XXXI'), (32, 'XXXII'), (33, 'XXXIII'), (34, 'XXXIV'), (35, 'XXXV'),
    (36, 'XXXVI'), (37, 'XXXVII'), (38, 'XXXVIII'), (39, 'XXXIX'), (40, 'XL')
  ) as t(num, roman)
),
jordan_models as (
  select m.id as model_id, m.canonical_label::int as num
  from public.catalog_models m
  join public.catalog_brands b on b.id = m.brand_id and b.canonical_label = 'Air Jordan'
  where m.tenant_id is null and m.canonical_label ~ '^[0-9]+$'
)
insert into public.catalog_aliases (
  tenant_id, entity_type, model_id, alias_label, alias_normalized, priority, is_active
)
select
  null,
  'model',
  jm.model_id,
  alias_label,
  regexp_replace(lower(alias_label), '[^a-z0-9]+', ' ', 'g'),
  1,
  true
from jordan_models jm
left join roman_numerals rn on rn.num = jm.num
cross join lateral (
  values
    (concat('Jordan ', jm.num)),
    (concat('AJ', jm.num)),
    (concat('Air Jordan ', jm.num)),
    (concat('Jordan ', rn.roman))
) as aliases(alias_label);

-- Designer Model Aliases
insert into public.catalog_aliases (
  tenant_id, entity_type, model_id, alias_label, alias_normalized, priority, is_active
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
    ('Out Of Office', 'OOO', 'Off-White')
) as input(model_label, alias_label, brand_label)
join public.catalog_brands brand on brand.canonical_label = input.brand_label and brand.tenant_id is null
join public.catalog_models model on model.canonical_label = input.model_label and model.brand_id = brand.id and model.tenant_id is null;

commit;