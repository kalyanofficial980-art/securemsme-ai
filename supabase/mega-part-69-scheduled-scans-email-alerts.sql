-- Mega Part 69: Scheduled Scans + Email Alerts
-- Safe scheduled scan monitoring, email alert preferences and outbound email queue.
-- No aggressive scanning, no exploit payloads, no destructive automation, no spam sending.

create extension if not exists pgcrypto;

create table if not exists public.email_alert_preferences_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,

  alert_email text not null default '',
  alert_status text not null default 'enabled'
    check (alert_status in ('enabled', 'paused', 'disabled')),
  send_scan_summary boolean not null default true,
  send_high_risk_alerts boolean not null default true,
  send_regression_alerts boolean not null default true,
  send_billing_alerts boolean not null default true,
  send_weekly_digest boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start text not null default '22:00',
  quiet_hours_end text not null default '07:00',

  consent_status text not null default 'consented'
    check (consent_status in ('consented', 'revoked', 'pending')),
  unsubscribe_token text not null default encode(gen_random_bytes(18), 'hex'),
  preference_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scheduled_scan_targets_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,

  target_url text not null,
  target_name text not null default '',
  schedule_status text not null default 'active'
    check (schedule_status in ('active', 'paused', 'disabled', 'archived')),
  schedule_frequency text not null default 'weekly'
    check (schedule_frequency in ('daily', 'weekly', 'monthly')),
  schedule_scope text not null default 'safe-public-checks'
    check (schedule_scope in ('safe-public-checks', 'monitoring-only', 'client-approved-review')),
  timezone text not null default 'Asia/Kolkata',
  preferred_hour integer not null default 9 check (preferred_hour >= 0 and preferred_hour <= 23),
  next_run_at timestamptz,
  last_run_at timestamptz,

  authorization_confirmed boolean not null default false,
  authorization_note text not null default '',
  email_alerts_enabled boolean not null default true,
  alert_email_override text not null default '',

  risk_threshold text not null default 'High'
    check (risk_threshold in ('Critical', 'High', 'Medium', 'Low')),
  blocked_claims jsonb not null default '[]'::jsonb,
  target_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scheduled_scan_runs_v2 (
  id uuid primary key default gen_random_uuid(),
  schedule_target_id uuid not null references public.scheduled_scan_targets_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,

  run_status text not null default 'completed'
    check (run_status in ('queued', 'running', 'completed', 'failed', 'skipped', 'needs-review')),
  run_type text not null default 'scheduled-safe-check'
    check (run_type in ('scheduled-safe-check', 'manual-scheduled-check', 'digest-only')),
  target_url text not null,

  risk_level text not null default 'Medium'
    check (risk_level in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 100),
  summary text not null default '',
  detected_change_summary text not null default '',
  safe_next_action text not null default '',
  email_should_send boolean not null default false,
  email_reason text not null default '',

  source_counts jsonb not null default '{}'::jsonb,
  run_payload jsonb not null default '{}'::jsonb,

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.scheduled_scan_alerts_v2 (
  id uuid primary key default gen_random_uuid(),
  scheduled_run_id uuid references public.scheduled_scan_runs_v2(id) on delete cascade,
  schedule_target_id uuid references public.scheduled_scan_targets_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,

  alert_type text not null default 'scan-summary'
    check (alert_type in ('scan-summary', 'high-risk', 'regression', 'digest', 'schedule-paused', 'manual-review')),
  alert_status text not null default 'open'
    check (alert_status in ('open', 'acknowledged', 'resolved', 'archived')),
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  alert_title text not null,
  alert_body text not null default '',
  client_safe_summary text not null default '',
  developer_action text not null default '',
  evidence_summary text not null default '',
  alert_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

create table if not exists public.email_alert_queue_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  schedule_target_id uuid references public.scheduled_scan_targets_v2(id) on delete set null,
  scheduled_run_id uuid references public.scheduled_scan_runs_v2(id) on delete set null,
  alert_id uuid references public.scheduled_scan_alerts_v2(id) on delete set null,

  recipient_email text not null,
  email_subject text not null,
  email_body text not null default '',
  email_type text not null default 'scan-summary'
    check (email_type in ('scan-summary', 'high-risk', 'regression', 'weekly-digest', 'billing-alert', 'support-alert')),
  delivery_status text not null default 'queued'
    check (delivery_status in ('queued', 'provider-not-configured', 'sent', 'failed', 'cancelled', 'suppressed')),
  delivery_provider text not null default 'manual-queue',
  provider_message_id text not null default '',
  failure_reason text not null default '',
  safe_footer text not null default 'SecureMSME AI provides safe authorized security review guidance. It does not guarantee 100% security or legal certification.',
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  email_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.email_alert_events_v2 (
  id uuid primary key default gen_random_uuid(),
  email_queue_id uuid references public.email_alert_queue_v2(id) on delete cascade,
  schedule_target_id uuid references public.scheduled_scan_targets_v2(id) on delete set null,
  scheduled_run_id uuid references public.scheduled_scan_runs_v2(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,

  event_type text not null default 'email-event'
    check (event_type in ('schedule-created', 'schedule-updated', 'scheduled-run-created', 'alert-created', 'email-queued', 'email-suppressed', 'email-event')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists email_alert_preferences_v2_user_id_idx on public.email_alert_preferences_v2(user_id);
create index if not exists scheduled_scan_targets_v2_user_id_idx on public.scheduled_scan_targets_v2(user_id);
create index if not exists scheduled_scan_targets_v2_next_run_idx on public.scheduled_scan_targets_v2(next_run_at, schedule_status);
create index if not exists scheduled_scan_runs_v2_target_idx on public.scheduled_scan_runs_v2(schedule_target_id, created_at desc);
create index if not exists scheduled_scan_alerts_v2_user_idx on public.scheduled_scan_alerts_v2(user_id, created_at desc);
create index if not exists email_alert_queue_v2_status_idx on public.email_alert_queue_v2(delivery_status, send_after);
create index if not exists email_alert_events_v2_created_at_idx on public.email_alert_events_v2(created_at desc);

alter table public.email_alert_preferences_v2 enable row level security;
alter table public.scheduled_scan_targets_v2 enable row level security;
alter table public.scheduled_scan_runs_v2 enable row level security;
alter table public.scheduled_scan_alerts_v2 enable row level security;
alter table public.email_alert_queue_v2 enable row level security;
alter table public.email_alert_events_v2 enable row level security;

drop policy if exists "Users can read own email alert preferences v2" on public.email_alert_preferences_v2;
create policy "Users can read own email alert preferences v2" on public.email_alert_preferences_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own email alert preferences v2" on public.email_alert_preferences_v2;
create policy "Users can insert own email alert preferences v2" on public.email_alert_preferences_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own email alert preferences v2" on public.email_alert_preferences_v2;
create policy "Users can update own email alert preferences v2" on public.email_alert_preferences_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own scheduled scan targets v2" on public.scheduled_scan_targets_v2;
create policy "Users can read own scheduled scan targets v2" on public.scheduled_scan_targets_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own scheduled scan targets v2" on public.scheduled_scan_targets_v2;
create policy "Users can insert own scheduled scan targets v2" on public.scheduled_scan_targets_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own scheduled scan targets v2" on public.scheduled_scan_targets_v2;
create policy "Users can update own scheduled scan targets v2" on public.scheduled_scan_targets_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own scheduled scan runs v2" on public.scheduled_scan_runs_v2;
create policy "Users can read own scheduled scan runs v2" on public.scheduled_scan_runs_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own scheduled scan runs v2" on public.scheduled_scan_runs_v2;
create policy "Users can insert own scheduled scan runs v2" on public.scheduled_scan_runs_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own scheduled scan alerts v2" on public.scheduled_scan_alerts_v2;
create policy "Users can read own scheduled scan alerts v2" on public.scheduled_scan_alerts_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own scheduled scan alerts v2" on public.scheduled_scan_alerts_v2;
create policy "Users can insert own scheduled scan alerts v2" on public.scheduled_scan_alerts_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own scheduled scan alerts v2" on public.scheduled_scan_alerts_v2;
create policy "Users can update own scheduled scan alerts v2" on public.scheduled_scan_alerts_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own email queue v2" on public.email_alert_queue_v2;
create policy "Users can read own email queue v2" on public.email_alert_queue_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own email queue v2" on public.email_alert_queue_v2;
create policy "Users can insert own email queue v2" on public.email_alert_queue_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can update email queue v2" on public.email_alert_queue_v2;
create policy "Admins can update email queue v2" on public.email_alert_queue_v2
for update to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own email alert events v2" on public.email_alert_events_v2;
create policy "Users can read own email alert events v2" on public.email_alert_events_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own email alert events v2" on public.email_alert_events_v2;
create policy "Users can insert own email alert events v2" on public.email_alert_events_v2
for insert to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_scheduled_scans_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_email_alert_preferences_v2_updated_at on public.email_alert_preferences_v2;
create trigger touch_email_alert_preferences_v2_updated_at
before update on public.email_alert_preferences_v2
for each row execute function public.touch_scheduled_scans_v2_updated_at();

drop trigger if exists touch_scheduled_scan_targets_v2_updated_at on public.scheduled_scan_targets_v2;
create trigger touch_scheduled_scan_targets_v2_updated_at
before update on public.scheduled_scan_targets_v2
for each row execute function public.touch_scheduled_scans_v2_updated_at();
