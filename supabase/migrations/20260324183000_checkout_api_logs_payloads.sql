-- Migration: add sanitized request/response payload storage to checkout_api_logs

ALTER TABLE public.checkout_api_logs
  ADD COLUMN IF NOT EXISTS request_payload jsonb,
  ADD COLUMN IF NOT EXISTS response_payload jsonb;
