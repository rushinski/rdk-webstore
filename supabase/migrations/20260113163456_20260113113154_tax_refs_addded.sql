
  create table "public"."nexus_registrations" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "state_code" character varying(2) not null,
    "registration_type" character varying(20) not null,
    "is_registered" boolean not null default false,
    "registered_at" timestamp with time zone,
    "stripe_registration_id" character varying(255),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."nexus_registrations" enable row level security;


  create table "public"."state_sales_tracking" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "state_code" character varying(2) not null,
    "year" integer not null,
    "month" integer not null,
    "total_sales" numeric(10,2) not null default 0,
    "taxable_sales" numeric(10,2) not null default 0,
    "transaction_count" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."state_sales_tracking" enable row level security;


  create table "public"."tenant_tax_settings" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "home_state" character varying(2) not null,
    "business_name" character varying(255),
    "tax_id_number" character varying(50),
    "stripe_tax_settings_id" character varying(255),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."tenant_tax_settings" enable row level security;

alter table "public"."orders" add column "customer_state" character varying(2);

alter table "public"."orders" add column "stripe_tax_transaction_id" character varying(255);

alter table "public"."orders" add column "tax_amount" numeric(10,2) default 0;

alter table "public"."orders" add column "tax_calculation_id" character varying(255);

alter table "public"."products" add column "stripe_tax_code" character varying(50);

CREATE INDEX idx_nexus_registrations_state ON public.nexus_registrations USING btree (state_code);

CREATE INDEX idx_nexus_registrations_tenant ON public.nexus_registrations USING btree (tenant_id);

CREATE INDEX idx_state_sales_date ON public.state_sales_tracking USING btree (year, month);

CREATE INDEX idx_state_sales_state ON public.state_sales_tracking USING btree (state_code);

CREATE INDEX idx_state_sales_tenant ON public.state_sales_tracking USING btree (tenant_id);

CREATE INDEX idx_tenant_tax_settings_tenant ON public.tenant_tax_settings USING btree (tenant_id);

CREATE UNIQUE INDEX nexus_registrations_pkey ON public.nexus_registrations USING btree (id);

CREATE UNIQUE INDEX nexus_registrations_tenant_id_state_code_key ON public.nexus_registrations USING btree (tenant_id, state_code);

CREATE UNIQUE INDEX state_sales_tracking_pkey ON public.state_sales_tracking USING btree (id);

CREATE UNIQUE INDEX state_sales_tracking_tenant_id_state_code_year_month_key ON public.state_sales_tracking USING btree (tenant_id, state_code, year, month);

CREATE UNIQUE INDEX tenant_tax_settings_pkey ON public.tenant_tax_settings USING btree (id);

CREATE UNIQUE INDEX tenant_tax_settings_tenant_id_key ON public.tenant_tax_settings USING btree (tenant_id);

alter table "public"."nexus_registrations" add constraint "nexus_registrations_pkey" PRIMARY KEY using index "nexus_registrations_pkey";

alter table "public"."state_sales_tracking" add constraint "state_sales_tracking_pkey" PRIMARY KEY using index "state_sales_tracking_pkey";

alter table "public"."tenant_tax_settings" add constraint "tenant_tax_settings_pkey" PRIMARY KEY using index "tenant_tax_settings_pkey";

alter table "public"."nexus_registrations" add constraint "nexus_registrations_registration_type_check" CHECK (((registration_type)::text = ANY ((ARRAY['physical'::character varying, 'economic'::character varying])::text[]))) not valid;

alter table "public"."nexus_registrations" validate constraint "nexus_registrations_registration_type_check";

alter table "public"."nexus_registrations" add constraint "nexus_registrations_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."nexus_registrations" validate constraint "nexus_registrations_tenant_id_fkey";

alter table "public"."nexus_registrations" add constraint "nexus_registrations_tenant_id_state_code_key" UNIQUE using index "nexus_registrations_tenant_id_state_code_key";

alter table "public"."state_sales_tracking" add constraint "state_sales_tracking_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."state_sales_tracking" validate constraint "state_sales_tracking_tenant_id_fkey";

alter table "public"."state_sales_tracking" add constraint "state_sales_tracking_tenant_id_state_code_year_month_key" UNIQUE using index "state_sales_tracking_tenant_id_state_code_year_month_key";

alter table "public"."tenant_tax_settings" add constraint "tenant_tax_settings_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_tax_settings" validate constraint "tenant_tax_settings_tenant_id_fkey";

alter table "public"."tenant_tax_settings" add constraint "tenant_tax_settings_tenant_id_key" UNIQUE using index "tenant_tax_settings_tenant_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_state_sales_tracking()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    INSERT INTO state_sales_tracking (
      tenant_id,
      state_code,
      year,
      month,
      total_sales,
      taxable_sales,
      transaction_count
    )
    VALUES (
      NEW.tenant_id,
      COALESCE(NEW.customer_state, 'SC'), -- Default to SC for pickups
      EXTRACT(YEAR FROM NEW.created_at),
      EXTRACT(MONTH FROM NEW.created_at),
      NEW.total,
      NEW.total - COALESCE(NEW.shipping, 0),
      1
    )
    ON CONFLICT (tenant_id, state_code, year, month)
    DO UPDATE SET
      total_sales = state_sales_tracking.total_sales + EXCLUDED.total_sales,
      taxable_sales = state_sales_tracking.taxable_sales + EXCLUDED.taxable_sales,
      transaction_count = state_sales_tracking.transaction_count + EXCLUDED.transaction_count,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."nexus_registrations" to "anon";

grant insert on table "public"."nexus_registrations" to "anon";

grant references on table "public"."nexus_registrations" to "anon";

grant select on table "public"."nexus_registrations" to "anon";

grant trigger on table "public"."nexus_registrations" to "anon";

grant truncate on table "public"."nexus_registrations" to "anon";

grant update on table "public"."nexus_registrations" to "anon";

grant delete on table "public"."nexus_registrations" to "authenticated";

grant insert on table "public"."nexus_registrations" to "authenticated";

grant references on table "public"."nexus_registrations" to "authenticated";

grant select on table "public"."nexus_registrations" to "authenticated";

grant trigger on table "public"."nexus_registrations" to "authenticated";

grant truncate on table "public"."nexus_registrations" to "authenticated";

grant update on table "public"."nexus_registrations" to "authenticated";

grant delete on table "public"."nexus_registrations" to "postgres";

grant insert on table "public"."nexus_registrations" to "postgres";

grant references on table "public"."nexus_registrations" to "postgres";

grant select on table "public"."nexus_registrations" to "postgres";

grant trigger on table "public"."nexus_registrations" to "postgres";

grant truncate on table "public"."nexus_registrations" to "postgres";

grant update on table "public"."nexus_registrations" to "postgres";

grant delete on table "public"."nexus_registrations" to "service_role";

grant insert on table "public"."nexus_registrations" to "service_role";

grant references on table "public"."nexus_registrations" to "service_role";

grant select on table "public"."nexus_registrations" to "service_role";

grant trigger on table "public"."nexus_registrations" to "service_role";

grant truncate on table "public"."nexus_registrations" to "service_role";

grant update on table "public"."nexus_registrations" to "service_role";

grant delete on table "public"."state_sales_tracking" to "anon";

grant insert on table "public"."state_sales_tracking" to "anon";

grant references on table "public"."state_sales_tracking" to "anon";

grant select on table "public"."state_sales_tracking" to "anon";

grant trigger on table "public"."state_sales_tracking" to "anon";

grant truncate on table "public"."state_sales_tracking" to "anon";

grant update on table "public"."state_sales_tracking" to "anon";

grant delete on table "public"."state_sales_tracking" to "authenticated";

grant insert on table "public"."state_sales_tracking" to "authenticated";

grant references on table "public"."state_sales_tracking" to "authenticated";

grant select on table "public"."state_sales_tracking" to "authenticated";

grant trigger on table "public"."state_sales_tracking" to "authenticated";

grant truncate on table "public"."state_sales_tracking" to "authenticated";

grant update on table "public"."state_sales_tracking" to "authenticated";

grant delete on table "public"."state_sales_tracking" to "postgres";

grant insert on table "public"."state_sales_tracking" to "postgres";

grant references on table "public"."state_sales_tracking" to "postgres";

grant select on table "public"."state_sales_tracking" to "postgres";

grant trigger on table "public"."state_sales_tracking" to "postgres";

grant truncate on table "public"."state_sales_tracking" to "postgres";

grant update on table "public"."state_sales_tracking" to "postgres";

grant delete on table "public"."state_sales_tracking" to "service_role";

grant insert on table "public"."state_sales_tracking" to "service_role";

grant references on table "public"."state_sales_tracking" to "service_role";

grant select on table "public"."state_sales_tracking" to "service_role";

grant trigger on table "public"."state_sales_tracking" to "service_role";

grant truncate on table "public"."state_sales_tracking" to "service_role";

grant update on table "public"."state_sales_tracking" to "service_role";

grant delete on table "public"."tenant_tax_settings" to "anon";

grant insert on table "public"."tenant_tax_settings" to "anon";

grant references on table "public"."tenant_tax_settings" to "anon";

grant select on table "public"."tenant_tax_settings" to "anon";

grant trigger on table "public"."tenant_tax_settings" to "anon";

grant truncate on table "public"."tenant_tax_settings" to "anon";

grant update on table "public"."tenant_tax_settings" to "anon";

grant delete on table "public"."tenant_tax_settings" to "authenticated";

grant insert on table "public"."tenant_tax_settings" to "authenticated";

grant references on table "public"."tenant_tax_settings" to "authenticated";

grant select on table "public"."tenant_tax_settings" to "authenticated";

grant trigger on table "public"."tenant_tax_settings" to "authenticated";

grant truncate on table "public"."tenant_tax_settings" to "authenticated";

grant update on table "public"."tenant_tax_settings" to "authenticated";

grant delete on table "public"."tenant_tax_settings" to "postgres";

grant insert on table "public"."tenant_tax_settings" to "postgres";

grant references on table "public"."tenant_tax_settings" to "postgres";

grant select on table "public"."tenant_tax_settings" to "postgres";

grant trigger on table "public"."tenant_tax_settings" to "postgres";

grant truncate on table "public"."tenant_tax_settings" to "postgres";

grant update on table "public"."tenant_tax_settings" to "postgres";

grant delete on table "public"."tenant_tax_settings" to "service_role";

grant insert on table "public"."tenant_tax_settings" to "service_role";

grant references on table "public"."tenant_tax_settings" to "service_role";

grant select on table "public"."tenant_tax_settings" to "service_role";

grant trigger on table "public"."tenant_tax_settings" to "service_role";

grant truncate on table "public"."tenant_tax_settings" to "service_role";

grant update on table "public"."tenant_tax_settings" to "service_role";


  create policy "Admins can manage nexus registrations"
  on "public"."nexus_registrations"
  as permissive
  for all
  to public
using ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Admins can view state sales"
  on "public"."state_sales_tracking"
  as permissive
  for select
  to public
using ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));



  create policy "Admins can manage tax settings"
  on "public"."tenant_tax_settings"
  as permissive
  for all
  to public
using ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


CREATE TRIGGER trigger_update_state_sales_tracking AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_state_sales_tracking();


