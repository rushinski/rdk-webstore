-- Remove obsolete payment/tax vendor schema surfaces after the storefront
-- was collapsed to a processor-neutral order submission flow.

begin;

drop table if exists public.tenant_payrilla_credentials cascade;
drop table if exists public.tax_rate_cache cascade;
drop table if exists public.payment_webhook_events cascade;

alter table public.orders
  drop constraint if exists orders_nofraud_decision_check;

alter table public.orders
  drop column if exists nofraud_transaction_id cascade,
  drop column if exists nofraud_decision cascade,
  drop column if exists payrilla_transaction_id cascade,
  drop column if exists stripe_session_id cascade;

alter table public.payment_transactions
  add column if not exists processor_reference integer,
  add column if not exists authorization_code varchar(50),
  add column if not exists payment_status varchar(20) not null default 'pending',
  add column if not exists risk_review_id varchar(100),
  add column if not exists risk_decision varchar(20);

update public.payment_transactions
set
  processor_reference = coalesce(processor_reference, payrilla_reference_number),
  authorization_code = coalesce(authorization_code, payrilla_auth_code),
  payment_status = coalesce(nullif(payment_status, ''), payrilla_status, 'pending'),
  risk_review_id = coalesce(risk_review_id, nofraud_transaction_id),
  risk_decision = coalesce(risk_decision, nofraud_decision);

alter table public.payment_transactions
  drop column if exists payrilla_reference_number cascade,
  drop column if exists payrilla_auth_code cascade,
  drop column if exists payrilla_status cascade,
  drop column if exists nofraud_transaction_id cascade,
  drop column if exists nofraud_decision cascade;

create index if not exists idx_payment_transactions_processor_reference
  on public.payment_transactions(processor_reference)
  where processor_reference is not null;

alter table public.chargeback_evidence
  add column if not exists risk_review_id text,
  add column if not exists risk_decision text;

update public.chargeback_evidence
set
  risk_review_id = coalesce(risk_review_id, nofraud_transaction_id),
  risk_decision = coalesce(risk_decision, nofraud_decision);

alter table public.chargeback_evidence
  drop column if exists nofraud_transaction_id cascade,
  drop column if exists nofraud_decision cascade;

alter table public.profiles
  drop column if exists payrilla_account_id cascade,
  drop column if exists payrilla_customer_token cascade,
  drop column if exists stripe_customer_id cascade;

commit;
