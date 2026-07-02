-- Mega Part 49: Real Email Provider Integration

create extension if not exists pgcrypto;

-- Non-secret email provider preferences.
-- API keys must stay in environment variables, never database.
create table if not exists public.email_provider_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  provider text not null default 'resend'
    check (provider in ('resend', 'development')),
  enabled boolean not null default true,
  from_email text,
  from_name text not null default 'SecureMSME AI',
  reply_to text,
  recipient_email text,
  minimum_severity text not null default 'Medium'
    check (minimum_severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  send_regression_alerts boolean not null default true,
  send_score_drop_alerts boolean not null default true,
  send_risk_increase_alerts boolean not null default true,
  send_weekly_summary boolean not null default false,

  last_test_sent_at timestamptz,
  last_delivery_at timestamptz,
  configuration_status text not null default 'not-tested'
    check (configuration_status in ('ready', 'not-tested', 'missing-env', 'failed')),
  configuration_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id)
);

create table if not exists public.email_provider_delivery_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,
  notification_id uuid references public.security_alert_notifications(id) on delete set null,

  provider text not null default 'resend'
    check (provider in ('resend', 'development')),
  delivery_type text not null default 'security-alert'
    check (delivery_type in ('security-alert', 'test-email', 'weekly-summary')),
  recipient_email text not null,
  from_email text,
  subject text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped', 'provider-not-configured')),
  provider_message_id text,
  error_message text,
  request_metadata jsonb not null default '{}'::jsonb,
  response_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.email_provider_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delivery_run_id uuid references public.email_provider_delivery_runs(id) on delete cascade,

  event_type text not null default 'email-info'
    check (event_type in ('email-info', 'email-sent', 'email-failed', 'email-skipped', 'email-config-updated', 'test-email')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

-- Harden Part 48 tables if present.
alter table if exists public.security_alert_notifications
  add column if not exists email_delivery_status text not null default 'not-sent';

alter table if exists public.security_alert_notifications
  add column if not exists email_provider_message_id text;

alter table if exists public.security_alert_notifications
  add column if not exists email_last_error text;

alter table if exists public.security_alert_notifications
  add column if not exists email_sent_at timestamptz;

alter table if exists public.security_alert_delivery_attempts
  add column if not exists provider text;

alter table if exists public.security_alert_delivery_attempts
  add column if not exists provider_message_id text;

alter table if exists public.security_alert_delivery_attempts
  add column if not exists provider_error text;

create index if not exists email_provider_settings_user_id_idx on public.email_provider_settings(user_id);
create index if not exists email_provider_delivery_runs_user_id_idx on public.email_provider_delivery_runs(user_id);
create index if not exists email_provider_delivery_runs_notification_id_idx on public.email_provider_delivery_runs(notification_id);
create index if not exists email_provider_delivery_runs_source_scan_id_idx on public.email_provider_delivery_runs(source_scan_id);
create index if not exists email_provider_delivery_runs_status_idx on public.email_provider_delivery_runs(status);
create index if not exists email_provider_delivery_runs_created_at_idx on public.email_provider_delivery_runs(created_at desc);
create index if not exists email_provider_events_user_id_idx on public.email_provider_events(user_id);
create index if not exists email_provider_events_delivery_run_id_idx on public.email_provider_events(delivery_run_id);
create index if not exists email_provider_events_type_idx on public.email_provider_events(event_type);

alter table public.email_provider_settings enable row level security;
alter table public.email_provider_delivery_runs enable row level security;
alter table public.email_provider_events enable row level security;

drop policy if exists "Users and admins can read email provider settings" on public.email_provider_settings;
create policy "Users and admins can read email provider settings"
on public.email_provider_settings
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own email provider settings" on public.email_provider_settings;
create policy "Users can insert own email provider settings"
on public.email_provider_settings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own email provider settings" on public.email_provider_settings;
create policy "Users can update own email provider settings"
on public.email_provider_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read email delivery runs" on public.email_provider_delivery_runs;
create policy "Users and admins can read email delivery runs"
on public.email_provider_delivery_runs
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own email delivery runs" on public.email_provider_delivery_runs;
create policy "Users can insert own email delivery runs"
on public.email_provider_delivery_runs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own email delivery runs" on public.email_provider_delivery_runs;
create policy "Users can update own email delivery runs"
on public.email_provider_delivery_runs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read email provider events" on public.email_provider_events;
create policy "Users and admins can read email provider events"
on public.email_provider_events
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own email provider events" on public.email_provider_events;
create policy "Users can insert own email provider events"
on public.email_provider_events
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.set_email_provider_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_email_provider_settings_updated_at on public.email_provider_settings;
create trigger set_email_provider_settings_updated_at
before update on public.email_provider_settings
for each row
execute function public.set_email_provider_settings_updated_at();
