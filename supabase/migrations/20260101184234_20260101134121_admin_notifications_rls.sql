
  create policy "admin_notifications_delete_own"
  on "public"."admin_notifications"
  as permissive
  for delete
  to public
using ((auth.uid() = admin_id));



  create policy "admin_notifications_select_own"
  on "public"."admin_notifications"
  as permissive
  for select
  to public
using ((auth.uid() = admin_id));



  create policy "admin_notifications_update_own"
  on "public"."admin_notifications"
  as permissive
  for update
  to public
using ((auth.uid() = admin_id))
with check ((auth.uid() = admin_id));



