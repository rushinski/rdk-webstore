alter table "public"."tenants" enable row level security;


  create policy "Service role can manage tenants"
  on "public"."tenants"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Users can view their own tenant"
  on "public"."tenants"
  as permissive
  for select
  to authenticated
using ((id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



