-- Enable RLS
alter table public.email_subscribers enable row level security;

-- Everyone can SUBSCRIBE (insert only)
create policy "email_subscribers_insert_anyone"
on public.email_subscribers
for insert
to anon, authenticated
with check (true);