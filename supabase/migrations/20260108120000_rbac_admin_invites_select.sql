begin;

drop policy if exists "Devs can view their invites" on public.admin_invites;

create policy "Privileged admins can view invites"
  on public.admin_invites
  for select
  using (public.is_super_admin());

commit;
