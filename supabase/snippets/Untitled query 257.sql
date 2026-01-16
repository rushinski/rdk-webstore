alter table nexus_registrations
  add column if not exists tracking_started_at timestamptz null;
