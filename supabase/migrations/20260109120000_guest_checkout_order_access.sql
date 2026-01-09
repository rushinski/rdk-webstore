-- Guest checkout order access tokens + order events

alter table "public"."orders" add column "guest_email" text;
alter table "public"."orders" add column "pickup_location_id" uuid;
alter table "public"."orders" add column "pickup_instructions" text;

alter table "public"."orders"
  add constraint "orders_guest_email_required"
  check ((user_id is not null) or (guest_email is not null)) not valid;

alter table "public"."orders" validate constraint "orders_guest_email_required";

create table "public"."order_access_tokens" (
  "id" uuid not null default gen_random_uuid(),
  "order_id" uuid not null,
  "token_hash" text not null,
  "expires_at" timestamp with time zone not null,
  "last_used_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);

alter table "public"."order_access_tokens" enable row level security;

create table "public"."order_events" (
  "id" uuid not null default gen_random_uuid(),
  "order_id" uuid not null,
  "type" text not null,
  "message" text,
  "created_at" timestamp with time zone default now() not null,
  "created_by" uuid
);

alter table "public"."order_events" enable row level security;

create index "order_access_tokens_order_id_idx" on "public"."order_access_tokens" using btree ("order_id");
create unique index "order_access_tokens_token_hash_key" on "public"."order_access_tokens" using btree ("token_hash");
create unique index "order_access_tokens_pkey" on "public"."order_access_tokens" using btree ("id");

create index "order_events_order_id_idx" on "public"."order_events" using btree ("order_id");
create index "order_events_created_at_idx" on "public"."order_events" using btree ("created_at");
create unique index "order_events_pkey" on "public"."order_events" using btree ("id");

alter table "public"."order_access_tokens"
  add constraint "order_access_tokens_pkey" primary key using index "order_access_tokens_pkey";

alter table "public"."order_access_tokens"
  add constraint "order_access_tokens_order_id_fkey"
  foreign key ("order_id") references "public"."orders" ("id") on delete cascade not valid;

alter table "public"."order_access_tokens" validate constraint "order_access_tokens_order_id_fkey";

alter table "public"."order_events"
  add constraint "order_events_pkey" primary key using index "order_events_pkey";

alter table "public"."order_events"
  add constraint "order_events_order_id_fkey"
  foreign key ("order_id") references "public"."orders" ("id") on delete cascade not valid;

alter table "public"."order_events" validate constraint "order_events_order_id_fkey";

alter table "public"."order_events"
  add constraint "order_events_created_by_fkey"
  foreign key ("created_by") references "public"."profiles" ("id") not valid;

alter table "public"."order_events" validate constraint "order_events_created_by_fkey";

grant delete on table "public"."order_access_tokens" to "anon";
grant insert on table "public"."order_access_tokens" to "anon";
grant references on table "public"."order_access_tokens" to "anon";
grant select on table "public"."order_access_tokens" to "anon";
grant trigger on table "public"."order_access_tokens" to "anon";
grant truncate on table "public"."order_access_tokens" to "anon";
grant update on table "public"."order_access_tokens" to "anon";

grant delete on table "public"."order_access_tokens" to "authenticated";
grant insert on table "public"."order_access_tokens" to "authenticated";
grant references on table "public"."order_access_tokens" to "authenticated";
grant select on table "public"."order_access_tokens" to "authenticated";
grant trigger on table "public"."order_access_tokens" to "authenticated";
grant truncate on table "public"."order_access_tokens" to "authenticated";
grant update on table "public"."order_access_tokens" to "authenticated";

grant delete on table "public"."order_access_tokens" to "service_role";
grant insert on table "public"."order_access_tokens" to "service_role";
grant references on table "public"."order_access_tokens" to "service_role";
grant select on table "public"."order_access_tokens" to "service_role";
grant trigger on table "public"."order_access_tokens" to "service_role";
grant truncate on table "public"."order_access_tokens" to "service_role";
grant update on table "public"."order_access_tokens" to "service_role";

grant delete on table "public"."order_events" to "anon";
grant insert on table "public"."order_events" to "anon";
grant references on table "public"."order_events" to "anon";
grant select on table "public"."order_events" to "anon";
grant trigger on table "public"."order_events" to "anon";
grant truncate on table "public"."order_events" to "anon";
grant update on table "public"."order_events" to "anon";

grant delete on table "public"."order_events" to "authenticated";
grant insert on table "public"."order_events" to "authenticated";
grant references on table "public"."order_events" to "authenticated";
grant select on table "public"."order_events" to "authenticated";
grant trigger on table "public"."order_events" to "authenticated";
grant truncate on table "public"."order_events" to "authenticated";
grant update on table "public"."order_events" to "authenticated";

grant delete on table "public"."order_events" to "service_role";
grant insert on table "public"."order_events" to "service_role";
grant references on table "public"."order_events" to "service_role";
grant select on table "public"."order_events" to "service_role";
grant trigger on table "public"."order_events" to "service_role";
grant truncate on table "public"."order_events" to "service_role";
grant update on table "public"."order_events" to "service_role";

create policy "users_select_own_order_events"
on "public"."order_events"
as permissive
for select
to public
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_events.order_id
      and orders.user_id = auth.uid()
  )
);

create policy "admin_full_order_events"
on "public"."order_events"
as permissive
for all
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) in ('admin', 'super_admin', 'dev')
)
with check (
  (select role from public.profiles where id = auth.uid()) in ('admin', 'super_admin', 'dev')
);
