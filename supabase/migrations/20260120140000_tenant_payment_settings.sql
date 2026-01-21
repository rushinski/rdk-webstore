create table if not exists public.tenant_payment_settings (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  use_automatic_payment_methods boolean not null default true,
  payment_method_types text[] not null default '{}'::text[],
  express_checkout_methods text[] not null default '{apple_pay,google_pay,link}'::text[],
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.tenant_payment_settings enable row level security;

create unique index if not exists tenant_payment_settings_pkey on public.tenant_payment_settings using btree (id);
create unique index if not exists tenant_payment_settings_tenant_id_key on public.tenant_payment_settings using btree (tenant_id);

alter table public.tenant_payment_settings add constraint tenant_payment_settings_pkey primary key using index tenant_payment_settings_pkey;
alter table public.tenant_payment_settings add constraint tenant_payment_settings_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade not valid;
alter table public.tenant_payment_settings validate constraint tenant_payment_settings_tenant_id_fkey;

create policy "Admins can manage payment settings"
  on public.tenant_payment_settings
  as permissive
  for all
  to public
using ((tenant_id in (
  select profiles.tenant_id
  from public.profiles
  where profiles.id = auth.uid()
)));

create trigger update_tenant_payment_settings_updated_at
  before update on public.tenant_payment_settings
  for each row execute function public.update_updated_at_column();

grant delete on table "public"."tenant_payment_settings" to "anon";
grant insert on table "public"."tenant_payment_settings" to "anon";
grant references on table "public"."tenant_payment_settings" to "anon";
grant select on table "public"."tenant_payment_settings" to "anon";
grant trigger on table "public"."tenant_payment_settings" to "anon";
grant truncate on table "public"."tenant_payment_settings" to "anon";
grant update on table "public"."tenant_payment_settings" to "anon";

grant delete on table "public"."tenant_payment_settings" to "authenticated";
grant insert on table "public"."tenant_payment_settings" to "authenticated";
grant references on table "public"."tenant_payment_settings" to "authenticated";
grant select on table "public"."tenant_payment_settings" to "authenticated";
grant trigger on table "public"."tenant_payment_settings" to "authenticated";
grant truncate on table "public"."tenant_payment_settings" to "authenticated";
grant update on table "public"."tenant_payment_settings" to "authenticated";

grant delete on table "public"."tenant_payment_settings" to "postgres";
grant insert on table "public"."tenant_payment_settings" to "postgres";
grant references on table "public"."tenant_payment_settings" to "postgres";
grant select on table "public"."tenant_payment_settings" to "postgres";
grant trigger on table "public"."tenant_payment_settings" to "postgres";
grant truncate on table "public"."tenant_payment_settings" to "postgres";
grant update on table "public"."tenant_payment_settings" to "postgres";

grant delete on table "public"."tenant_payment_settings" to "service_role";
grant insert on table "public"."tenant_payment_settings" to "service_role";
grant references on table "public"."tenant_payment_settings" to "service_role";
grant select on table "public"."tenant_payment_settings" to "service_role";
grant trigger on table "public"."tenant_payment_settings" to "service_role";
grant truncate on table "public"."tenant_payment_settings" to "service_role";
grant update on table "public"."tenant_payment_settings" to "service_role";
