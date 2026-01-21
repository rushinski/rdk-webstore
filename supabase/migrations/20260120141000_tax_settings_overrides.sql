alter table public.tenant_tax_settings
  add column if not exists tax_enabled boolean not null default true,
  add column if not exists tax_code_overrides jsonb not null default '{}'::jsonb;
