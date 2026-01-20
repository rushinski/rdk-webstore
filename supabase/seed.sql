begin;

insert into public.tenants (name)
select 'Realdealkickzsc'
where not exists (
  select 1 from public.tenants where name = 'Realdealkickzsc'
);

insert into public.marketplaces (tenant_id, name)
select t.id, 'RDK Storefront'
from public.tenants t
where t.name = 'Realdealkickzsc'
  and not exists (
    select 1 from public.marketplaces m
    where m.tenant_id = t.id
      and m.name = 'RDK Storefront'
  );

commit;
