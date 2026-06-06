begin;

alter table public.lightspeed_product_links
  add column if not exists lightspeed_family_id text,
  add column if not exists last_website_modified_at timestamptz,
  add column if not exists last_lightspeed_modified_at timestamptz,
  add column if not exists last_sync_direction text,
  add column if not exists tombstoned_at timestamptz,
  add column if not exists last_error text;

create index if not exists idx_lightspeed_links_tenant_family_id
  on public.lightspeed_product_links (tenant_id, lightspeed_family_id);

create index if not exists idx_lightspeed_links_tenant_variant_remote
  on public.lightspeed_product_links (tenant_id, lightspeed_variant_id);

commit;
