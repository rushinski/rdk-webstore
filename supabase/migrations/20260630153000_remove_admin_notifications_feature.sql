drop table if exists public.admin_notifications cascade;

alter table if exists public.profiles
  drop column if exists admin_order_notifications_enabled;
