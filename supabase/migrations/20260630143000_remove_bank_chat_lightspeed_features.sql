begin;

delete from public.admin_notifications
where type = 'chat_message';

alter table if exists public.admin_notifications
  drop constraint if exists admin_notifications_chat_id_fkey;

alter table if exists public.admin_notifications
  drop column if exists chat_id;

alter table if exists public.profiles
  drop column if exists chat_notifications_enabled;

drop table if exists public.chat_messages cascade;
drop table if exists public.chats cascade;
drop table if exists public.payout_settings cascade;
drop table if exists public.deleted_product_recovery cascade;
drop table if exists public.lightspeed_sync_run_items cascade;
drop table if exists public.lightspeed_sync_runs cascade;
drop table if exists public.lightspeed_webhook_events cascade;
drop table if exists public.lightspeed_product_links cascade;
drop table if exists public.tenant_lightspeed_settings cascade;

commit;
