alter table public.products
add column if not exists excluded_auto_tag_keys text[] not null default '{}';

comment on column public.products.excluded_auto_tag_keys is
  'Keys like "group_key:label" representing auto tags user has hidden (e.g. condition:used).';
