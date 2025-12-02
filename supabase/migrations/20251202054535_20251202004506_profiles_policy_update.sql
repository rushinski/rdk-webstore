drop policy "admin_full_profiles" on "public"."profiles";

drop policy "customer_own_profile_rw" on "public"."profiles";

drop policy "admin_full_auditlog" on "public"."admin_audit_log";

drop policy "admin_full_orders" on "public"."orders";

drop policy "customer_rw_own_orders" on "public"."orders";

drop policy "admin_full_products" on "public"."products";

alter table "public"."profiles" drop column "avatar_url";

alter table "public"."profiles" drop column "display_name";

alter table "public"."profiles" add column "full_name" text;

alter table "public"."profiles" add column "totp_secret" text;


  create policy "profiles_insert_own"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));



  create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((auth.uid() = id));



  create policy "profiles_update_own"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));



  create policy "admin_full_auditlog"
  on "public"."admin_audit_log"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



  create policy "admin_full_orders"
  on "public"."orders"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



  create policy "customer_rw_own_orders"
  on "public"."orders"
  as permissive
  for all
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "admin_full_products"
  on "public"."products"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



