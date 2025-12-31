begin;

-- Roles + profile preferences
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['customer'::text, 'admin'::text, 'super_admin'::text, 'dev'::text])) not valid;
alter table public.profiles validate constraint profiles_role_check;

alter table public.profiles
  add column if not exists chat_notifications_enabled boolean not null default true;

alter table public.profiles
  add column if not exists admin_order_notifications_enabled boolean not null default true;

alter table public.profiles
  add column if not exists admin_chat_created_notifications_enabled boolean not null default true;

alter table public.profiles
  add column if not exists is_primary_admin boolean not null default false;

create unique index if not exists profiles_primary_admin_unique
  on public.profiles (is_primary_admin)
  where is_primary_admin;

-- Admin helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'dev')
  );
$function$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'dev')
  );
$function$;

create or replace function public.is_dev()
returns boolean
language sql
stable
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'dev'
  );
$function$;

create or replace function public.is_admin_for_tenant(target_tenant uuid)
returns boolean
language sql
stable
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin', 'dev')
      and p.tenant_id = target_tenant
  );
$function$;

-- Update privileged-field guard for new admin tiers
create or replace function public.block_privileged_field_changes()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  acting_role text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select role into acting_role
  from public.profiles
  where id = auth.uid();

  if acting_role in ('admin', 'super_admin', 'dev') then
    return new;
  end if;

  if new.role <> old.role then
    raise exception 'Cannot modify role';
  end if;

  if new.totp_secret <> old.totp_secret then
    raise exception 'Cannot modify totp_secret';
  end if;

  if new.twofa_enabled <> old.twofa_enabled then
    raise exception 'Cannot modify twofa_enabled';
  end if;

  if new.is_primary_admin <> old.is_primary_admin then
    raise exception 'Cannot modify is_primary_admin';
  end if;

  return new;
end;
$function$;

-- Chats
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid null references public.orders(id) on delete set null,
  status text not null default 'open',
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz null,
  closed_by uuid null references public.profiles(id) on delete set null,
  constraint chats_status_check check (status in ('open', 'closed')),
  constraint chats_source_check check (source in ('manual', 'order'))
);

create index if not exists chats_user_id_idx on public.chats (user_id);
create index if not exists chats_status_idx on public.chats (status, created_at desc);
create unique index if not exists chats_open_user_unique on public.chats (user_id) where status = 'open';
create unique index if not exists chats_order_id_key on public.chats (order_id) where order_id is not null;

alter table public.chats enable row level security;

create policy "Users can view own chats"
  on public.chats
  for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Users can create chats"
  on public.chats
  for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy "Users can update own chats"
  on public.chats
  for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_sender_role_check check (sender_role in ('customer', 'admin'))
);

create index if not exists chat_messages_chat_idx on public.chat_messages (chat_id, created_at);

alter table public.chat_messages enable row level security;

create policy "Chat participants can view messages"
  on public.chat_messages
  for select
  using (
    exists (
      select 1
      from public.chats
      where chats.id = chat_messages.chat_id
        and (chats.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "Chat participants can send messages"
  on public.chat_messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.chats
      where chats.id = chat_messages.chat_id
        and (chats.user_id = auth.uid() or public.is_admin())
    )
  );

-- Admin notifications
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  message text not null,
  order_id uuid null references public.orders(id) on delete set null,
  chat_id uuid null references public.chats(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz null,
  constraint admin_notifications_type_check check (type in ('order_placed', 'chat_created', 'chat_message'))
);

create index if not exists admin_notifications_admin_idx on public.admin_notifications (admin_id, created_at desc);

alter table public.admin_notifications enable row level security;

create policy "Admins can view own notifications"
  on public.admin_notifications
  for select
  using (admin_id = auth.uid() and public.is_admin());

create policy "Admins can update own notifications"
  on public.admin_notifications
  for update
  using (admin_id = auth.uid() and public.is_admin())
  with check (admin_id = auth.uid() and public.is_admin());

-- Admin invites
create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz null,
  accepted_by uuid null references public.profiles(id) on delete set null,
  constraint admin_invites_role_check check (role in ('admin', 'super_admin'))
);

create index if not exists admin_invites_created_by_idx on public.admin_invites (created_by, created_at desc);

alter table public.admin_invites enable row level security;

create policy "Super admins can view their invites"
  on public.admin_invites
  for select
  using (created_by = auth.uid() and public.is_super_admin());

create policy "Super admins can create invites"
  on public.admin_invites
  for insert
  with check (
    created_by = auth.uid()
    and (
      (role = 'admin' and public.is_super_admin())
      or (role = 'super_admin' and public.is_dev())
    )
  );

-- Payout settings
create table if not exists public.payout_settings (
  id uuid primary key default gen_random_uuid(),
  primary_admin_id uuid not null references public.profiles(id) on delete restrict,
  provider text null,
  account_label text null,
  account_last4 text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payout_settings_singleton on public.payout_settings ((1));

alter table public.payout_settings enable row level security;

create policy "Admins can view payout settings"
  on public.payout_settings
  for select
  using (public.is_super_admin() or primary_admin_id = auth.uid());

create policy "Admins can update payout settings"
  on public.payout_settings
  for update
  using (public.is_super_admin() or primary_admin_id = auth.uid())
  with check (public.is_super_admin() or primary_admin_id = auth.uid());

create policy "Admins can insert payout settings"
  on public.payout_settings
  for insert
  with check (public.is_super_admin() or primary_admin_id = auth.uid());

-- Policy updates for admin tier expansion

drop policy if exists "admin_full_auditlog" on public.admin_audit_log;
create policy "admin_full_auditlog"
  on public.admin_audit_log
  as permissive
  for all
  to authenticated
  using (public.is_admin());

drop policy if exists "admin_full_orders" on public.orders;
create policy "admin_full_orders"
  on public.orders
  as permissive
  for all
  to authenticated
  using (public.is_admin());

drop policy if exists "admin_full_products" on public.products;
create policy "admin_full_products"
  on public.products
  as permissive
  for all
  to authenticated
  using (public.is_admin());

drop policy if exists "admin_full_shipping_defaults" on public.shipping_defaults;
create policy "admin_full_shipping_defaults"
  on public.shipping_defaults
  as permissive
  for all
  to authenticated
  using (public.is_admin());

drop policy if exists "admin_full_order_items" on public.order_items;
create policy "admin_full_order_items"
  on public.order_items
  as permissive
  for all
  to authenticated
  using (public.is_admin());

drop policy if exists "admin_full_order_shipping" on public.order_shipping;
create policy "admin_full_order_shipping"
  on public.order_shipping
  as permissive
  for all
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can manage images" on public.product_images;
create policy "Admins can manage images"
  on public.product_images
  as permissive
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage product tags" on public.product_tags;
create policy "Admins can manage product tags"
  on public.product_tags
  as permissive
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage variants" on public.product_variants;
create policy "Admins can manage variants"
  on public.product_variants
  as permissive
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
  on public.products
  as permissive
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage tags" on public.tags;
create policy "Admins can manage tags"
  on public.tags
  as permissive
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Allow admin read site pageviews" on public.site_pageviews;
create policy "Allow admin read site pageviews"
  on public.site_pageviews
  for select
  using (public.is_admin());

drop policy if exists "Allow admin read contact messages" on public.contact_messages;
create policy "Allow admin read contact messages"
  on public.contact_messages
  for select
  using (public.is_admin());

-- Updated_at triggers
create trigger update_chats_updated_at
  before update on public.chats
  for each row execute function public.update_updated_at_column();

create trigger update_payout_settings_updated_at
  before update on public.payout_settings
  for each row execute function public.update_updated_at_column();

commit;
