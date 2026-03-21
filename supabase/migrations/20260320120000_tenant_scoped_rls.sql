-- =============================================================================
-- Migration: 20260320120000_tenant_scoped_rls
-- Purpose:  Migrate payment infrastructure from Stripe to PayRilla + ZipTax + NoFraud.
--           Rename Stripe-specific columns to generic names.
--           Add full chargeback evidence locker, email audit log,
--           shipping tracking events, and immutable transaction audit log.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. RENAME STRIPE COLUMNS ON `orders`
-- ---------------------------------------------------------------------------

ALTER TABLE public.orders
  RENAME COLUMN stripe_payment_intent_id TO payment_transaction_id;

ALTER TABLE public.orders
  RENAME COLUMN stripe_tax_transaction_id TO tax_transaction_id;

-- Add PayRilla + NoFraud columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payrilla_transaction_id text,
  ADD COLUMN IF NOT EXISTS nofraud_transaction_id text,
  ADD COLUMN IF NOT EXISTS nofraud_decision text;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_nofraud_decision_check
  CHECK (nofraud_decision IS NULL OR nofraud_decision = ANY (ARRAY['pass','fail','review']));

-- ---------------------------------------------------------------------------
-- 2. RENAME STRIPE COLUMNS ON `profiles`
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  RENAME COLUMN stripe_account_id TO payrilla_account_id;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payrilla_customer_token text;

-- ---------------------------------------------------------------------------
-- 3. RENAME `stripe_events` TABLE → `payment_webhook_events`
-- ---------------------------------------------------------------------------

ALTER TABLE public.stripe_events RENAME TO payment_webhook_events;
ALTER TABLE public.payment_webhook_events RENAME COLUMN stripe_event_id TO webhook_event_id;

-- Update the existing unique constraint name for clarity
-- (Postgres renames the index automatically on RENAME TABLE, but constraint name stays)
ALTER INDEX IF EXISTS stripe_events_stripe_event_id_key
  RENAME TO payment_webhook_events_webhook_event_id_key;

ALTER INDEX IF EXISTS stripe_events_pkey
  RENAME TO payment_webhook_events_pkey;

-- ---------------------------------------------------------------------------
-- 4. DROP STRIPE-SPECIFIC COLUMNS FROM TAX TABLES
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenant_tax_settings
  DROP COLUMN IF EXISTS stripe_tax_settings_id;

ALTER TABLE public.nexus_registrations
  DROP COLUMN IF EXISTS stripe_registration_id;

-- ---------------------------------------------------------------------------
-- 5. NEW TABLE: `tenant_payrilla_credentials`
--    Stores per-tenant encrypted PayRilla API key + Tokenization key.
--    Service role only — never exposed to client.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_payrilla_credentials (
  id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL,
  api_key_encrypted       text        NOT NULL,
  tokenization_key_encrypted text     NOT NULL,
  payrilla_merchant_id    text,
  is_active               boolean     NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_payrilla_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_payrilla_credentials_tenant_id_key UNIQUE (tenant_id),
  CONSTRAINT tenant_payrilla_credentials_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE
);

ALTER TABLE public.tenant_payrilla_credentials ENABLE ROW LEVEL SECURITY;

-- Service role only — credentials must never be exposed via client queries
CREATE POLICY "Service role only: payrilla credentials"
  ON public.tenant_payrilla_credentials
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false);

grant select, insert, update, delete on table public.tenant_payrilla_credentials to service_role;
grant select, insert, update, delete on table public.tenant_payrilla_credentials to postgres;

-- ---------------------------------------------------------------------------
-- 6. NEW TABLE: `tax_rate_cache`
--    Cache ZipTax responses by zip code (30-day TTL).
--    Prevents exhausting the free-tier 100 req/month limit.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tax_rate_cache (
  id            uuid          NOT NULL DEFAULT gen_random_uuid(),
  zip_code      text          NOT NULL,
  state_code    text,
  combined_rate numeric(6,4)  NOT NULL,
  state_rate    numeric(6,4),
  county_rate   numeric(6,4),
  city_rate     numeric(6,4),
  district_rate numeric(6,4),
  breakdown     jsonb,
  cached_at     timestamptz   NOT NULL DEFAULT now(),
  expires_at    timestamptz   NOT NULL DEFAULT (now() + interval '30 days'),
  CONSTRAINT tax_rate_cache_pkey PRIMARY KEY (id),
  CONSTRAINT tax_rate_cache_zip_code_key UNIQUE (zip_code)
);

ALTER TABLE public.tax_rate_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tax_rate_cache_zip_code  ON public.tax_rate_cache (zip_code);
CREATE INDEX IF NOT EXISTS idx_tax_rate_cache_expires_at ON public.tax_rate_cache (expires_at);

-- Service role only
CREATE POLICY "Service role only: tax rate cache"
  ON public.tax_rate_cache
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false);

grant select, insert, update, delete on table public.tax_rate_cache to service_role;
grant select, insert, update, delete on table public.tax_rate_cache to postgres;

-- ---------------------------------------------------------------------------
-- 7. NEW TABLE: `transaction_audit_log`
--    Immutable append-only event log for every payment lifecycle event.
--    Used as legal evidence in chargebacks and disputes.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.transaction_audit_log (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id    uuid,
  tenant_id   uuid        NOT NULL,
  event_type  text        NOT NULL,
  -- payment_initiated | payment_succeeded | payment_failed
  -- refund_requested | refund_issued | chargeback_received
  -- nofraud_pass | nofraud_fail | nofraud_review
  -- order_confirmed | email_sent | label_created | delivered
  actor       text        NOT NULL,
  -- customer | system | admin:{user_id}
  data        jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transaction_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT transaction_audit_log_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT transaction_audit_log_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

ALTER TABLE public.transaction_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_transaction_audit_log_order_id
  ON public.transaction_audit_log (order_id);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_log_tenant_created
  ON public.transaction_audit_log (tenant_id, created_at DESC);

-- Tenant staff: SELECT only. Service role: INSERT only. No UPDATE/DELETE.
CREATE POLICY "Tenant staff can view audit log"
  ON public.transaction_audit_log
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT profiles.tenant_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

grant select on table public.transaction_audit_log to authenticated;
grant select, insert on table public.transaction_audit_log to service_role;
grant select, insert on table public.transaction_audit_log to postgres;

-- ---------------------------------------------------------------------------
-- 8. NEW TABLE: `chargeback_evidence`
--    Full evidence locker for every order. Updated throughout lifecycle.
--    Covers: fraud disputes (NoFraud), item-not-received, item-not-as-described.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chargeback_evidence (
  id                          uuid         NOT NULL DEFAULT gen_random_uuid(),
  order_id                    uuid         NOT NULL,
  tenant_id                   uuid         NOT NULL,

  -- Fraud defense (NoFraud)
  nofraud_transaction_id      text,
  nofraud_decision            text,
  avs_result_code             text,
  cvv_result_code             text,
  customer_ip                 inet,
  device_fingerprint          text,

  -- Payment proof
  payment_transaction_id      text,
  payment_amount              numeric(10,2),
  payment_currency            text,
  payment_method_last4        text,
  payment_method_type         text,

  -- Address snapshots at time of transaction
  billing_address_snapshot    jsonb,
  shipping_address_snapshot   jsonb,

  -- Delivery proof (item-not-received defense)
  carrier                     text,
  tracking_number             text,
  delivery_confirmed_at       timestamptz,
  delivery_event_snapshot     jsonb,

  -- Product proof (item-not-as-described defense)
  order_snapshot              jsonb,

  -- Tax proof
  tax_calculation_snapshot    jsonb,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chargeback_evidence_pkey PRIMARY KEY (id),
  CONSTRAINT chargeback_evidence_order_id_key UNIQUE (order_id),
  CONSTRAINT chargeback_evidence_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT chargeback_evidence_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

ALTER TABLE public.chargeback_evidence ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chargeback_evidence_order_id
  ON public.chargeback_evidence (order_id);
CREATE INDEX IF NOT EXISTS idx_chargeback_evidence_tenant_id
  ON public.chargeback_evidence (tenant_id);

CREATE POLICY "Tenant staff can view chargeback evidence"
  ON public.chargeback_evidence
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT profiles.tenant_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

grant select on table public.chargeback_evidence to authenticated;
grant select, insert, update on table public.chargeback_evidence to service_role;
grant select, insert, update on table public.chargeback_evidence to postgres;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_chargeback_evidence_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chargeback_evidence_updated_at
  BEFORE UPDATE ON public.chargeback_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_chargeback_evidence_updated_at();

-- ---------------------------------------------------------------------------
-- 9. NEW TABLE: `email_audit_log`
--    Every email sent is recorded with full HTML snapshot.
--    Used to prove receipt/order confirmations were sent.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_audit_log (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id            uuid,
  tenant_id           uuid        NOT NULL,
  email_type          text        NOT NULL,
  -- order_confirmation | receipt | refund_notification
  -- shipping_update | delivery_confirmation | pickup_instructions
  recipient_email     text        NOT NULL,
  subject             text,
  html_snapshot       text,
  plain_text_snapshot text,
  message_id          text,
  delivery_status     text        NOT NULL DEFAULT 'sent',
  -- sent | delivered | bounced | failed
  sent_at             timestamptz NOT NULL DEFAULT now(),
  delivered_at        timestamptz,
  opened_at           timestamptz,
  CONSTRAINT email_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT email_audit_log_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT email_audit_log_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

ALTER TABLE public.email_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_audit_log_order_id
  ON public.email_audit_log (order_id);
CREATE INDEX IF NOT EXISTS idx_email_audit_log_tenant_sent
  ON public.email_audit_log (tenant_id, sent_at DESC);

CREATE POLICY "Tenant staff can view email audit log"
  ON public.email_audit_log
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT profiles.tenant_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

grant select on table public.email_audit_log to authenticated;
grant select, insert, update on table public.email_audit_log to service_role;
grant select, insert, update on table public.email_audit_log to postgres;

-- ---------------------------------------------------------------------------
-- 10. NEW TABLE: `shipping_tracking_events`
--     Carrier tracking event snapshots — proves delivery for chargebacks.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shipping_tracking_events (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id              uuid        NOT NULL,
  tenant_id             uuid        NOT NULL,
  carrier               text        NOT NULL,
  tracking_number       text        NOT NULL,
  event_timestamp       timestamptz NOT NULL,
  status                text        NOT NULL,
  -- pre_transit | in_transit | out_for_delivery | delivered | exception | returned
  location              text,
  description           text,
  raw_carrier_response  jsonb,
  recorded_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipping_tracking_events_pkey PRIMARY KEY (id),
  CONSTRAINT shipping_tracking_events_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT shipping_tracking_events_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);

ALTER TABLE public.shipping_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_shipping_tracking_events_order_id
  ON public.shipping_tracking_events (order_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_shipping_tracking_events_tracking_number
  ON public.shipping_tracking_events (tracking_number);

CREATE POLICY "Tenant staff can view shipping tracking events"
  ON public.shipping_tracking_events
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT profiles.tenant_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

grant select on table public.shipping_tracking_events to authenticated;
grant select, insert on table public.shipping_tracking_events to service_role;
grant select, insert on table public.shipping_tracking_events to postgres;
