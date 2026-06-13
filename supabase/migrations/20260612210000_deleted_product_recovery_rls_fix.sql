drop policy if exists "Admins can manage deleted product recovery"
  on public.deleted_product_recovery;

create policy "Admins can manage deleted product recovery"
  on public.deleted_product_recovery
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin', 'dev')
        and profiles.tenant_id = deleted_product_recovery.tenant_id
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin', 'dev')
        and profiles.tenant_id = deleted_product_recovery.tenant_id
    )
  );
