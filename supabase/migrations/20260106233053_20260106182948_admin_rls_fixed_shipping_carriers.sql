drop policy "Admin can manage shipping carriers" on "public"."shipping_carriers";


  create policy "Admin can manage shipping carriers"
  on "public"."shipping_carriers"
  as permissive
  for all
  to public
using (((auth.jwt() ->> 'role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text, 'dev'::text])));



