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

-- Catalog seed data moved to supabase/seed.sql.

commit;
