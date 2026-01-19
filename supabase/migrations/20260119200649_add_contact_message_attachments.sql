alter table public.contact_messages
  add column if not exists attachments jsonb null;
