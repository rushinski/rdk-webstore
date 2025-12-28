create table if not exists public.site_pageviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null,
  referrer text null,
  visitor_id text not null,
  session_id text not null,
  user_id uuid null
);

create index if not exists site_pageviews_created_at_idx on public.site_pageviews (created_at desc);
create index if not exists site_pageviews_visitor_idx on public.site_pageviews (visitor_id);
create index if not exists site_pageviews_session_idx on public.site_pageviews (session_id);

alter table public.site_pageviews enable row level security;

create policy "Allow site pageview inserts"
  on public.site_pageviews
  for insert
  with check (true);

create policy "Allow admin read site pageviews"
  on public.site_pageviews
  for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
