create table if not exists "public"."email_subscription_tokens" (
  "id" uuid not null default gen_random_uuid(),
  "email" text not null,
  "token" text not null,
  "source" text,
  "created_at" timestamp with time zone not null default now(),
  "expires_at" timestamp with time zone not null
);

alter table "public"."email_subscription_tokens"
  add constraint "email_subscription_tokens_pkey" primary key ("id");

create unique index if not exists email_subscription_tokens_token_key
  on public.email_subscription_tokens using btree (token);

create index if not exists email_subscription_tokens_email_idx
  on public.email_subscription_tokens using btree (email);

alter table "public"."email_subscription_tokens" enable row level security;
