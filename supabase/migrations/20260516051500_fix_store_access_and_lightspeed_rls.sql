drop policy if exists "Admins can manage store access settings"
  on public.tenant_store_access_settings;

create policy "Admins can manage store access settings"
  on public.tenant_store_access_settings
  for all
  using (public.is_admin_for_tenant(tenant_id))
  with check (public.is_admin_for_tenant(tenant_id));

drop policy if exists "Admins can manage lightspeed settings"
  on public.tenant_lightspeed_settings;
drop policy if exists "Admins can manage lightspeed product links"
  on public.lightspeed_product_links;
drop policy if exists "Admins can manage lightspeed sync runs"
  on public.lightspeed_sync_runs;
drop policy if exists "Admins can manage lightspeed sync run items"
  on public.lightspeed_sync_run_items;
drop policy if exists "Admins can manage lightspeed webhook events"
  on public.lightspeed_webhook_events;

create policy "Admins can manage lightspeed settings"
  on public.tenant_lightspeed_settings
  for all
  using (public.is_admin_for_tenant(tenant_id))
  with check (public.is_admin_for_tenant(tenant_id));

create policy "Admins can manage lightspeed product links"
  on public.lightspeed_product_links
  for all
  using (public.is_admin_for_tenant(tenant_id))
  with check (public.is_admin_for_tenant(tenant_id));

create policy "Admins can manage lightspeed sync runs"
  on public.lightspeed_sync_runs
  for all
  using (public.is_admin_for_tenant(tenant_id))
  with check (public.is_admin_for_tenant(tenant_id));

create policy "Admins can manage lightspeed sync run items"
  on public.lightspeed_sync_run_items
  for all
  using (public.is_admin_for_tenant(tenant_id))
  with check (public.is_admin_for_tenant(tenant_id));

create policy "Admins can manage lightspeed webhook events"
  on public.lightspeed_webhook_events
  for all
  using (tenant_id is not null and public.is_admin_for_tenant(tenant_id))
  with check (tenant_id is not null and public.is_admin_for_tenant(tenant_id));
