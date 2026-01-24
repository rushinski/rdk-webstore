drop policy "Admin can manage shipping carriers" on "public"."shipping_carriers";


create policy "Admin can manage shipping carriers"
  on "public"."shipping_carriers"
  as permissive
  for all
  to authenticated
  using (
    exists (
      select 1 
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = any(array['admin'::text, 'super_admin'::text, 'dev'::text])
    )
  );



