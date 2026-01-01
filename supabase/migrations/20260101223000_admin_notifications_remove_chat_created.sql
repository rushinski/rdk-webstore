begin;

delete from public.admin_notifications where type = 'chat_created';

alter table public.admin_notifications drop constraint if exists admin_notifications_type_check;
alter table public.admin_notifications
  add constraint admin_notifications_type_check check (type in ('order_placed', 'chat_message'));

commit;
