-- Add billing address support for orders and users

-- Create order_billing table (similar to order_shipping)
create table "public"."order_billing" (
  "id" uuid not null default gen_random_uuid(),
  "order_id" uuid not null,
  "name" text,
  "phone" text,
  "line1" text,
  "line2" text,
  "city" text,
  "state" text,
  "postal_code" text,
  "country" text,
  "created_at" timestamp with time zone default now()
);

alter table "public"."order_billing" enable row level security;

-- Primary key
alter table "public"."order_billing"
  add constraint "order_billing_pkey" primary key ("id");

-- Foreign key to orders
alter table "public"."order_billing"
  add constraint "order_billing_order_id_fkey" foreign key ("order_id")
  references "public"."orders" ("id") on delete cascade;

-- Index for order lookups
create index "order_billing_order_id_idx" on "public"."order_billing" ("order_id");

-- One billing address per order
create unique index "order_billing_order_id_unique" on "public"."order_billing" ("order_id");

-- RLS policies for order_billing
create policy "Users can view their own order billing"
  on "public"."order_billing"
  for select
  using (
    exists (
      select 1 from "public"."orders"
      where "orders"."id" = "order_billing"."order_id"
      and "orders"."user_id" = auth.uid()
    )
  );

create policy "Staff can view all order billing"
  on "public"."order_billing"
  for select
  using (
    exists (
      select 1 from "public"."profiles"
      where "profiles"."id" = auth.uid()
      and "profiles"."role" in ('admin', 'staff')
    )
  );

-- Create user_billing_addresses table (for saved billing addresses)
create table "public"."user_billing_addresses" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "name" text,
  "phone" text,
  "line1" text,
  "line2" text,
  "city" text,
  "state" text,
  "postal_code" text,
  "country" text,
  "is_default" boolean default false,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

alter table "public"."user_billing_addresses" enable row level security;

-- Primary key
alter table "public"."user_billing_addresses"
  add constraint "user_billing_addresses_pkey" primary key ("id");

-- Foreign key to auth.users
alter table "public"."user_billing_addresses"
  add constraint "user_billing_addresses_user_id_fkey" foreign key ("user_id")
  references "auth"."users" ("id") on delete cascade;

-- Index for user lookups
create index "user_billing_addresses_user_id_idx" on "public"."user_billing_addresses" ("user_id");

-- RLS policies for user_billing_addresses
create policy "Users can view their own billing addresses"
  on "public"."user_billing_addresses"
  for select
  using (auth.uid() = "user_id");

create policy "Users can insert their own billing addresses"
  on "public"."user_billing_addresses"
  for insert
  with check (auth.uid() = "user_id");

create policy "Users can update their own billing addresses"
  on "public"."user_billing_addresses"
  for update
  using (auth.uid() = "user_id");

create policy "Users can delete their own billing addresses"
  on "public"."user_billing_addresses"
  for delete
  using (auth.uid() = "user_id");

create policy "Staff can view all billing addresses"
  on "public"."user_billing_addresses"
  for select
  using (
    exists (
      select 1 from "public"."profiles"
      where "profiles"."id" = auth.uid()
      and "profiles"."role" in ('admin', 'staff')
    )
  );
