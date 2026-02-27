alter table public.product_variants
add column if not exists sort_order integer not null default 0;

with needs_backfill as (
  select not exists (
    select 1
    from public.product_variants
    where sort_order <> 0
  ) as run_backfill
),
ranked as (
  select
    pv.id,
    row_number() over (partition by pv.product_id order by pv.id) - 1 as ordinal
  from public.product_variants pv
  cross join needs_backfill
  where needs_backfill.run_backfill
)
update public.product_variants pv
set sort_order = ranked.ordinal
from ranked
where pv.id = ranked.id;

create index if not exists idx_product_variants_product_sort_order
  on public.product_variants (product_id, sort_order);
