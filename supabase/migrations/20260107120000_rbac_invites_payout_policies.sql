begin;

drop policy if exists "Super admins can view their invites" on public.admin_invites;
drop policy if exists "Super admins can create invites" on public.admin_invites;

create policy "Devs can view their invites"
  on public.admin_invites
  for select
  using (created_by = auth.uid() and public.is_dev());

create policy "Devs can create invites"
  on public.admin_invites
  for insert
  with check (
    created_by = auth.uid()
    and public.is_dev()
    and role in ('admin', 'super_admin')
  );

drop policy if exists "Admins can view payout settings" on public.payout_settings;
drop policy if exists "Admins can update payout settings" on public.payout_settings;
drop policy if exists "Admins can insert payout settings" on public.payout_settings;

create policy "Super admins can view payout settings"
  on public.payout_settings
  for select
  using (public.is_super_admin());

create policy "Super admins can update payout settings"
  on public.payout_settings
  for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Super admins can insert payout settings"
  on public.payout_settings
  for insert
  with check (public.is_super_admin());

commit;
