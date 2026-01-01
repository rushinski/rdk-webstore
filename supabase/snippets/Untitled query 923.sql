alter table public.admin_notifications enable row level security;

-- Read your own notifications
drop policy if exists "admin_notifications_select_own" on public.admin_notifications;
create policy "admin_notifications_select_own"
on public.admin_notifications
for select
using (auth.uid() = admin_id);

-- Mark read (update) your own notifications
drop policy if exists "admin_notifications_update_own" on public.admin_notifications;
create policy "admin_notifications_update_own"
on public.admin_notifications
for update
using (auth.uid() = admin_id)
with check (auth.uid() = admin_id);

-- Delete your own notifications  ✅ THIS IS THE MISSING PIECE MOST OF THE TIME
drop policy if exists "admin_notifications_delete_own" on public.admin_notifications;
create policy "admin_notifications_delete_own"
on public.admin_notifications
for delete
using (auth.uid() = admin_id);
