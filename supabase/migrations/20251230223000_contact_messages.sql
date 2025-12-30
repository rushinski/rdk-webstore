create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text null,
  email text not null,
  subject text null,
  message text not null,
  source text null,
  user_id uuid null references public.profiles(id)
);

create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_email_idx on public.contact_messages (email);
create index if not exists contact_messages_user_idx on public.contact_messages (user_id);

alter table public.contact_messages enable row level security;

create policy "Allow contact message inserts"
  on public.contact_messages
  for insert
  with check (true);

create policy "Allow admin read contact messages"
  on public.contact_messages
  for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
