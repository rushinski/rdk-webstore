-- Migration: payment_transactions and payment_events
--
-- payment_transactions: one row per payment attempt, holds all processor data
-- payment_events: immutable append-only audit log, one row per state change
--
-- These replace the ad-hoc order status updates spread across the webhook handler
-- and provide full payment visibility for the seller dashboard.

-- ─── payment_transactions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),

  -- PayRilla processor data
  payrilla_reference_number INTEGER,
  payrilla_auth_code VARCHAR(50),
  payrilla_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- payrilla_status: 'authorized' | 'captured' | 'voided' | 'declined' | 'error'

  -- Card info (non-sensitive)
  card_type VARCHAR(20),
  card_last4 VARCHAR(4),
  card_bin VARCHAR(8),

  -- Verification results
  avs_result_code VARCHAR(5),
  cvv2_result_code VARCHAR(2),
  three_ds_status VARCHAR(2),
  three_ds_eci VARCHAR(2),

  -- NoFraud
  nofraud_transaction_id VARCHAR(100),
  nofraud_decision VARCHAR(20),
  -- nofraud_decision: 'pass' | 'fail' | 'review' | 'fraudulent'

  -- Money (stored in USD)
  amount_requested DECIMAL(10,2) NOT NULL,
  amount_authorized DECIMAL(10,2),
  amount_captured DECIMAL(10,2),
  amount_refunded DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Billing snapshot
  billing_name VARCHAR(255),
  billing_address TEXT,
  billing_city VARCHAR(100),
  billing_state VARCHAR(50),
  billing_zip VARCHAR(20),
  billing_country VARCHAR(2),
  billing_phone VARCHAR(50),

  -- Customer
  customer_email VARCHAR(255),
  customer_ip VARCHAR(50),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order
  ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant
  ON public.payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference
  ON public.payment_transactions(payrilla_reference_number)
  WHERE payrilla_reference_number IS NOT NULL;

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.update_payment_transactions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_payment_transactions_updated_at();

-- ─── payment_events ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),

  event_type VARCHAR(50) NOT NULL,
  -- Event types:
  --   payment_started          checkout initiated
  --   3ds_completed            3DS verification finished
  --   authorization_approved   PayRilla auth succeeded
  --   authorization_declined   PayRilla auth declined
  --   authorization_error      PayRilla returned error
  --   fraud_check_pass         NoFraud returned pass
  --   fraud_check_fail         NoFraud returned fail
  --   fraud_check_review       NoFraud returned review
  --   fraud_review_resolved    NoFraud review resolved
  --   payment_captured         Auth captured
  --   payment_voided           Auth voided
  --   payment_refunded         Full refund
  --   payment_refund_partial   Partial refund
  --   webhook_received         PayRilla webhook logged

  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_events_order
  ON public.payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_transaction
  ON public.payment_events(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_type
  ON public.payment_events(event_type);

-- ─── RLS policies (admin / service_role access only) ─────────────────────────

-- payment_transactions: admins can read their tenant's rows
CREATE POLICY "Admins can read own tenant payment_transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'staff')
        AND (payment_transactions.tenant_id IS NULL OR profiles.tenant_id = payment_transactions.tenant_id)
    )
  );

-- payment_events: same
CREATE POLICY "Admins can read own tenant payment_events"
  ON public.payment_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'staff')
        AND (payment_events.tenant_id IS NULL OR profiles.tenant_id = payment_events.tenant_id)
    )
  );

-- Grant service_role full access (needed for webhook handler + checkout route)
GRANT ALL ON public.payment_transactions TO service_role;
GRANT ALL ON public.payment_events TO service_role;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT SELECT ON public.payment_events TO authenticated;
