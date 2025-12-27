begin;

-- Admin helper (global)
create or replace function public.is_admin()
returns boolean
language sql
stable
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$function$;

-- Product title fields
alter table public.products
  add column if not exists title_raw text,
  add column if not exists model text,
  add column if not exists title_display text,
  add column if not exists brand_is_verified boolean not null default true,
  add column if not exists model_is_verified boolean not null default true,
  add column if not exists parse_confidence numeric,
  add column if not exists parse_version text;

update public.products
set
  title_raw = trim(concat_ws(' ', brand, name)),
  title_display = trim(concat_ws(' ', brand, name))
where title_raw is null or title_display is null;

alter table public.products
  alter column title_raw set not null,
  alter column title_display set not null;

-- Expand tags group keys
alter table public.tags drop constraint if exists tags_group_key_check;
alter table public.tags add constraint tags_group_key_check check (
  group_key = any (
    array[
      'brand',
      'model',
      'size_shoe',
      'size_clothing',
      'size_custom',
      'size_none',
      'condition',
      'category',
      'designer_brand',
      'custom',
      'collab'
    ]
  )
);

-- Catalog tables
create table if not exists public.catalog_brand_groups (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid null,
  key text not null,
  label text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists catalog_brand_groups_unique
  on public.catalog_brand_groups (tenant_id, key);

create unique index if not exists catalog_brand_groups_pkey
  on public.catalog_brand_groups (id);

alter table public.catalog_brand_groups
  add constraint catalog_brand_groups_pkey primary key using index catalog_brand_groups_pkey;

alter table public.catalog_brand_groups
  add constraint catalog_brand_groups_tenant_id_fkey
  foreign key (tenant_id) references public.tenants(id) on delete cascade not valid;
alter table public.catalog_brand_groups validate constraint catalog_brand_groups_tenant_id_fkey;

create table if not exists public.catalog_brands (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid null,
  group_id uuid not null,
  canonical_label text not null,
  is_active boolean not null default true,
  is_verified boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists catalog_brands_unique
  on public.catalog_brands (tenant_id, canonical_label);

create unique index if not exists catalog_brands_pkey
  on public.catalog_brands (id);

alter table public.catalog_brands
  add constraint catalog_brands_pkey primary key using index catalog_brands_pkey;

alter table public.catalog_brands
  add constraint catalog_brands_group_id_fkey
  foreign key (group_id) references public.catalog_brand_groups(id) on delete cascade not valid;
alter table public.catalog_brands validate constraint catalog_brands_group_id_fkey;

alter table public.catalog_brands
  add constraint catalog_brands_tenant_id_fkey
  foreign key (tenant_id) references public.tenants(id) on delete cascade not valid;
alter table public.catalog_brands validate constraint catalog_brands_tenant_id_fkey;

create table if not exists public.catalog_models (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid null,
  brand_id uuid not null,
  canonical_label text not null,
  is_active boolean not null default true,
  is_verified boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists catalog_models_unique
  on public.catalog_models (tenant_id, brand_id, canonical_label);

create unique index if not exists catalog_models_pkey
  on public.catalog_models (id);

alter table public.catalog_models
  add constraint catalog_models_pkey primary key using index catalog_models_pkey;

alter table public.catalog_models
  add constraint catalog_models_brand_id_fkey
  foreign key (brand_id) references public.catalog_brands(id) on delete cascade not valid;
alter table public.catalog_models validate constraint catalog_models_brand_id_fkey;

alter table public.catalog_models
  add constraint catalog_models_tenant_id_fkey
  foreign key (tenant_id) references public.tenants(id) on delete cascade not valid;
alter table public.catalog_models validate constraint catalog_models_tenant_id_fkey;

create table if not exists public.catalog_aliases (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid null,
  entity_type text not null,
  brand_id uuid null,
  model_id uuid null,
  alias_label text not null,
  alias_normalized text not null,
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint catalog_aliases_entity_check check (
    (entity_type = 'brand' and brand_id is not null and model_id is null) or
    (entity_type = 'model' and model_id is not null and brand_id is null)
  )
);

create unique index if not exists catalog_aliases_unique
  on public.catalog_aliases (tenant_id, entity_type, alias_normalized);

create unique index if not exists catalog_aliases_pkey
  on public.catalog_aliases (id);

alter table public.catalog_aliases
  add constraint catalog_aliases_pkey primary key using index catalog_aliases_pkey;

alter table public.catalog_aliases
  add constraint catalog_aliases_brand_id_fkey
  foreign key (brand_id) references public.catalog_brands(id) on delete cascade not valid;
alter table public.catalog_aliases validate constraint catalog_aliases_brand_id_fkey;

alter table public.catalog_aliases
  add constraint catalog_aliases_model_id_fkey
  foreign key (model_id) references public.catalog_models(id) on delete cascade not valid;
alter table public.catalog_aliases validate constraint catalog_aliases_model_id_fkey;

alter table public.catalog_aliases
  add constraint catalog_aliases_tenant_id_fkey
  foreign key (tenant_id) references public.tenants(id) on delete cascade not valid;
alter table public.catalog_aliases validate constraint catalog_aliases_tenant_id_fkey;

create table if not exists public.catalog_candidates (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  entity_type text not null,
  raw_text text not null,
  normalized_text text not null,
  parent_brand_id uuid null,
  status text not null default 'new',
  created_by uuid null,
  created_at timestamp with time zone default now(),
  constraint catalog_candidates_entity_check check (
    entity_type in ('brand', 'model')
  ),
  constraint catalog_candidates_status_check check (
    status in ('new', 'accepted', 'rejected')
  ),
  constraint catalog_candidates_model_brand_check check (
    (entity_type = 'brand' and parent_brand_id is null) or
    (entity_type = 'model' and parent_brand_id is not null)
  )
);

create index if not exists catalog_candidates_status_idx
  on public.catalog_candidates (status);

create unique index if not exists catalog_candidates_pkey
  on public.catalog_candidates (id);

alter table public.catalog_candidates
  add constraint catalog_candidates_pkey primary key using index catalog_candidates_pkey;

alter table public.catalog_candidates
  add constraint catalog_candidates_tenant_id_fkey
  foreign key (tenant_id) references public.tenants(id) on delete cascade not valid;
alter table public.catalog_candidates validate constraint catalog_candidates_tenant_id_fkey;

alter table public.catalog_candidates
  add constraint catalog_candidates_parent_brand_fkey
  foreign key (parent_brand_id) references public.catalog_brands(id) on delete restrict not valid;
alter table public.catalog_candidates validate constraint catalog_candidates_parent_brand_fkey;

alter table public.catalog_candidates
  add constraint catalog_candidates_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null not valid;
alter table public.catalog_candidates validate constraint catalog_candidates_created_by_fkey;

-- RLS
alter table public.catalog_brand_groups enable row level security;
alter table public.catalog_brands enable row level security;
alter table public.catalog_models enable row level security;
alter table public.catalog_aliases enable row level security;
alter table public.catalog_candidates enable row level security;

create policy "Public can view active brand groups"
  on public.catalog_brand_groups
  for select
  to public
  using (is_active = true);

create policy "Tenant admins can manage brand groups"
  on public.catalog_brand_groups
  for all
  to public
  using (public.is_admin_for_tenant(tenant_id) or (tenant_id is null and public.is_admin()))
  with check (public.is_admin_for_tenant(tenant_id) or (tenant_id is null and public.is_admin()));

create policy "Public can view active brands"
  on public.catalog_brands
  for select
  to public
  using (is_active = true);

create policy "Tenant admins can manage brands"
  on public.catalog_brands
  for all
  to public
  using (public.is_admin_for_tenant(tenant_id) or (tenant_id is null and public.is_admin()))
  with check (public.is_admin_for_tenant(tenant_id) or (tenant_id is null and public.is_admin()));

create policy "Public can view active models"
  on public.catalog_models
  for select
  to public
  using (is_active = true);

create policy "Tenant admins can manage models"
  on public.catalog_models
  for all
  to public
  using (public.is_admin_for_tenant(tenant_id) or (tenant_id is null and public.is_admin()))
  with check (public.is_admin_for_tenant(tenant_id) or (tenant_id is null and public.is_admin()));

create policy "Public can view active aliases"
  on public.catalog_aliases
  for select
  to public
  using (is_active = true);

create policy "Tenant admins can manage aliases"
  on public.catalog_aliases
  for all
  to public
  using (public.is_admin_for_tenant(tenant_id) or (tenant_id is null and public.is_admin()))
  with check (public.is_admin_for_tenant(tenant_id) or (tenant_id is null and public.is_admin()));

create policy "Tenant admins can manage candidates"
  on public.catalog_candidates
  for all
  to public
  using (public.is_admin_for_tenant(tenant_id))
  with check (public.is_admin_for_tenant(tenant_id));

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

commit;
