begin;

insert into public.catalog_brands (tenant_id, group_id, canonical_label, is_active, is_verified)
select
  null,
  groups.id,
  'Rick Owens',
  true,
  true
from public.catalog_brand_groups groups
where groups.key = 'designer' and groups.tenant_id is null
on conflict (tenant_id, canonical_label) do update
set group_id = excluded.group_id,
    is_active = true,
    is_verified = true;

commit;
