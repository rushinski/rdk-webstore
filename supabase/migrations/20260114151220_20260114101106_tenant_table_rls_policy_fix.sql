
  create policy "Allow service role to read tenants for signup"
  on "public"."tenants"
  as permissive
  for select
  to service_role
using (true);



