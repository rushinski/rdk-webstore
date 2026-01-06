
  create table "public"."shipping_carriers" (
    "id" uuid not null default gen_random_uuid(),
    "enabled_carriers" text[] not null default '{}'::text[],
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."shipping_carriers" enable row level security;

CREATE UNIQUE INDEX shipping_carriers_pkey ON public.shipping_carriers USING btree (id);

alter table "public"."shipping_carriers" add constraint "shipping_carriers_pkey" PRIMARY KEY using index "shipping_carriers_pkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_shipping_carriers_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."shipping_carriers" to "anon";

grant insert on table "public"."shipping_carriers" to "anon";

grant references on table "public"."shipping_carriers" to "anon";

grant select on table "public"."shipping_carriers" to "anon";

grant trigger on table "public"."shipping_carriers" to "anon";

grant truncate on table "public"."shipping_carriers" to "anon";

grant update on table "public"."shipping_carriers" to "anon";

grant delete on table "public"."shipping_carriers" to "authenticated";

grant insert on table "public"."shipping_carriers" to "authenticated";

grant references on table "public"."shipping_carriers" to "authenticated";

grant select on table "public"."shipping_carriers" to "authenticated";

grant trigger on table "public"."shipping_carriers" to "authenticated";

grant truncate on table "public"."shipping_carriers" to "authenticated";

grant update on table "public"."shipping_carriers" to "authenticated";

grant delete on table "public"."shipping_carriers" to "postgres";

grant insert on table "public"."shipping_carriers" to "postgres";

grant references on table "public"."shipping_carriers" to "postgres";

grant select on table "public"."shipping_carriers" to "postgres";

grant trigger on table "public"."shipping_carriers" to "postgres";

grant truncate on table "public"."shipping_carriers" to "postgres";

grant update on table "public"."shipping_carriers" to "postgres";

grant delete on table "public"."shipping_carriers" to "service_role";

grant insert on table "public"."shipping_carriers" to "service_role";

grant references on table "public"."shipping_carriers" to "service_role";

grant select on table "public"."shipping_carriers" to "service_role";

grant trigger on table "public"."shipping_carriers" to "service_role";

grant truncate on table "public"."shipping_carriers" to "service_role";

grant update on table "public"."shipping_carriers" to "service_role";


  create policy "Admin can manage shipping carriers"
  on "public"."shipping_carriers"
  as permissive
  for all
  to public
using (((auth.jwt() ->> 'role'::text) = 'admin'::text));


CREATE TRIGGER update_shipping_carriers_timestamp BEFORE UPDATE ON public.shipping_carriers FOR EACH ROW EXECUTE FUNCTION public.update_shipping_carriers_updated_at();


