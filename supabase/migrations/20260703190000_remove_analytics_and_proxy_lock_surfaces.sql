drop policy if exists "Allow admin read site pageviews" on public.site_pageviews;
drop policy if exists "Allow service role insert site pageviews" on public.site_pageviews;

drop table if exists public.site_pageviews cascade;

alter table if exists public.tenant_store_access_settings
  drop column if exists site_lock_enabled,
  drop column if exists site_unlock_at;
