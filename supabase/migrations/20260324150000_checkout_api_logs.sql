-- Migration: checkout_api_logs table
-- Records key API calls during checkout sessions for admin visibility.
-- Surfaced on the transaction detail page as the "Logs" section.

CREATE TABLE public.checkout_api_logs (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      uuid        REFERENCES public.orders(id) ON DELETE SET NULL,
  tenant_id     uuid,
  request_id    text,
  route         text        NOT NULL,
  method        text        NOT NULL DEFAULT 'POST',
  http_status   integer,
  duration_ms   integer,
  event_label   text,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX checkout_api_logs_order_id_idx  ON public.checkout_api_logs(order_id);
CREATE INDEX checkout_api_logs_created_at_idx ON public.checkout_api_logs(created_at);

ALTER TABLE public.checkout_api_logs ENABLE ROW LEVEL SECURITY;

-- Admins (via service role) can read; no direct client access
CREATE POLICY "Service role only: checkout api logs"
  ON public.checkout_api_logs
  FOR ALL
  USING (auth.role() = 'service_role');
