-- Mega Part 64: Monitoring Pro + Agency SOC
-- Passive regression monitoring and multi-client agency SOC overview.
-- No exploit payloads, no destructive testing, no private data exposure.

create extension if not exists pgcrypto;

create table if not exists public.monitoring_pro_targets_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  target_url text not null,
  target_name text not null default 'Monitored website',
  monitoring_status text not null default 'active'
    check (monitoring_status in ('active', 'paused', 'needs-review', 'archived')),
  monitoring_mode text not null default 'passive-safe'
    check (monitoring_mode in ('passive-safe', 'client-report-watch', 'agency-watch')),

  last_health_score integer not null default 0 check (last_health_score >= 0 and last_health_score <= 100),
  last_regression_score integer not null default 0 check (last_regression_score >= 0 and last_regression_score <= 100),
  last_risk_score integer not null default 0 check (last_risk_score >= 0 and last_risk_score <= 100),
  last_client_readiness_score integer not null default 0 check (last_client_readiness_score >= 0 and last_client_readiness_score <= 100),

  open_alert_count integer not null default 0,
  critical_alert_count integer not null default 0,
  high_alert_count integer not null default 0,
  regression_count integer not null default 0,
  verified_fixed_count integer not null default 0,

  monitoring_summary text not null default '',
  client_safe_summary text not null default '',
  developer_summary text not null default '',
  safety_summary text not null default '',
  blocked_claims jsonb not null default '[]'::jsonb,
  target_payload jsonb not null default '{}'::jsonb,

  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, scan_id)
);

create table if not exists public.monitoring_pro_runs_v2 (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.monitoring_pro_targets_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  run_status text not null default 'completed'
    check (run_status in ('queued', 'running', 'completed', 'needs-review', 'failed')),
  run_type text not null default 'passive-regression'
    check (run_type in ('passive-regression', 'client-readiness', 'agency-soc')),
  health_score integer not null default 0 check (health_score >= 0 and health_score <= 100),
  regression_score integer not null default 0 check (regression_score >= 0 and regression_score <= 100),
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 100),
  client_readiness_score integer not null default 0 check (client_readiness_score >= 0 and client_readiness_score <= 100),

  source_counts jsonb not null default '{}'::jsonb,
  run_summary text not null default '',
  regression_summary text not null default '',
  alert_summary text not null default '',
  run_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.monitoring_regression_alerts_v2 (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.monitoring_pro_targets_v2(id) on delete cascade,
  run_id uuid references public.monitoring_pro_runs_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  alert_status text not null default 'open'
    check (alert_status in ('open', 'acknowledged', 'in-progress', 'resolved', 'accepted-risk')),
  alert_type text not null default 'regression'
    check (alert_type in ('regression', 'new-risk', 'fix-regressed', 'client-readiness-drop', 'monitoring-gap', 'evidence-gap')),
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),

  alert_title text not null,
  affected_area text not null default '',
  before_summary text not null default '',
  after_summary text not null default '',
  evidence_summary text not null default '',
  developer_action text not null default '',
  client_safe_note text not null default '',
  blocked_claim text not null default '',

  acknowledged_at timestamptz,
  resolved_at timestamptz,
  alert_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agency_soc_snapshots_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,

  snapshot_title text not null default 'Agency SOC Dashboard',
  snapshot_status text not null default 'active'
    check (snapshot_status in ('active', 'needs-review', 'archived')),
  total_client_count integer not null default 0,
  active_monitoring_count integer not null default 0,
  open_alert_count integer not null default 0,
  critical_alert_count integer not null default 0,
  high_alert_count integer not null default 0,
  regression_count integer not null default 0,
  verified_fixed_count integer not null default 0,

  agency_health_score integer not null default 0 check (agency_health_score >= 0 and agency_health_score <= 100),
  agency_risk_score integer not null default 0 check (agency_risk_score >= 0 and agency_risk_score <= 100),
  agency_response_score integer not null default 0 check (agency_response_score >= 0 and agency_response_score <= 100),

  executive_summary text not null default '',
  operations_summary text not null default '',
  client_safe_summary text not null default '',
  blocked_claims jsonb not null default '[]'::jsonb,
  snapshot_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.agency_soc_client_risks_v2 (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.agency_soc_snapshots_v2(id) on delete cascade,
  target_id uuid references public.monitoring_pro_targets_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  client_name text not null default 'Client website',
  target_url text not null,
  risk_level text not null default 'Medium'
    check (risk_level in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 100),
  health_score integer not null default 0 check (health_score >= 0 and health_score <= 100),
  open_alert_count integer not null default 0,
  regression_count integer not null default 0,

  top_issue text not null default '',
  recommended_action text not null default '',
  client_safe_note text not null default '',
  risk_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.monitoring_soc_events_v2 (
  id uuid primary key default gen_random_uuid(),
  target_id uuid references public.monitoring_pro_targets_v2(id) on delete cascade,
  run_id uuid references public.monitoring_pro_runs_v2(id) on delete cascade,
  alert_id uuid references public.monitoring_regression_alerts_v2(id) on delete cascade,
  snapshot_id uuid references public.agency_soc_snapshots_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  event_type text not null default 'monitoring-event'
    check (event_type in ('target-created', 'monitoring-run-created', 'alert-created', 'alert-updated', 'soc-snapshot-created', 'monitoring-event')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists monitoring_pro_targets_v2_user_id_idx on public.monitoring_pro_targets_v2(user_id);
create index if not exists monitoring_pro_targets_v2_scan_id_idx on public.monitoring_pro_targets_v2(scan_id);
create index if not exists monitoring_pro_runs_v2_target_id_idx on public.monitoring_pro_runs_v2(target_id);
create index if not exists monitoring_regression_alerts_v2_target_id_idx on public.monitoring_regression_alerts_v2(target_id);
create index if not exists monitoring_regression_alerts_v2_status_idx on public.monitoring_regression_alerts_v2(alert_status);
create index if not exists agency_soc_snapshots_v2_user_id_idx on public.agency_soc_snapshots_v2(user_id);
create index if not exists agency_soc_client_risks_v2_snapshot_id_idx on public.agency_soc_client_risks_v2(snapshot_id);
create index if not exists monitoring_soc_events_v2_created_at_idx on public.monitoring_soc_events_v2(created_at desc);

alter table public.monitoring_pro_targets_v2 enable row level security;
alter table public.monitoring_pro_runs_v2 enable row level security;
alter table public.monitoring_regression_alerts_v2 enable row level security;
alter table public.agency_soc_snapshots_v2 enable row level security;
alter table public.agency_soc_client_risks_v2 enable row level security;
alter table public.monitoring_soc_events_v2 enable row level security;

drop policy if exists "Users can read own monitoring pro targets v2" on public.monitoring_pro_targets_v2;
create policy "Users can read own monitoring pro targets v2" on public.monitoring_pro_targets_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own monitoring pro targets v2" on public.monitoring_pro_targets_v2;
create policy "Users can insert own monitoring pro targets v2" on public.monitoring_pro_targets_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own monitoring pro targets v2" on public.monitoring_pro_targets_v2;
create policy "Users can update own monitoring pro targets v2" on public.monitoring_pro_targets_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own monitoring pro runs v2" on public.monitoring_pro_runs_v2;
create policy "Users can read own monitoring pro runs v2" on public.monitoring_pro_runs_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own monitoring pro runs v2" on public.monitoring_pro_runs_v2;
create policy "Users can insert own monitoring pro runs v2" on public.monitoring_pro_runs_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own monitoring alerts v2" on public.monitoring_regression_alerts_v2;
create policy "Users can read own monitoring alerts v2" on public.monitoring_regression_alerts_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own monitoring alerts v2" on public.monitoring_regression_alerts_v2;
create policy "Users can insert own monitoring alerts v2" on public.monitoring_regression_alerts_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own monitoring alerts v2" on public.monitoring_regression_alerts_v2;
create policy "Users can update own monitoring alerts v2" on public.monitoring_regression_alerts_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own agency soc snapshots v2" on public.agency_soc_snapshots_v2;
create policy "Users can read own agency soc snapshots v2" on public.agency_soc_snapshots_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own agency soc snapshots v2" on public.agency_soc_snapshots_v2;
create policy "Users can insert own agency soc snapshots v2" on public.agency_soc_snapshots_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own agency soc client risks v2" on public.agency_soc_client_risks_v2;
create policy "Users can read own agency soc client risks v2" on public.agency_soc_client_risks_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own agency soc client risks v2" on public.agency_soc_client_risks_v2;
create policy "Users can insert own agency soc client risks v2" on public.agency_soc_client_risks_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own monitoring soc events v2" on public.monitoring_soc_events_v2;
create policy "Users can read own monitoring soc events v2" on public.monitoring_soc_events_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own monitoring soc events v2" on public.monitoring_soc_events_v2;
create policy "Users can insert own monitoring soc events v2" on public.monitoring_soc_events_v2
for insert to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_monitoring_pro_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_monitoring_pro_targets_v2_updated_at on public.monitoring_pro_targets_v2;
create trigger touch_monitoring_pro_targets_v2_updated_at
before update on public.monitoring_pro_targets_v2
for each row execute function public.touch_monitoring_pro_v2_updated_at();

drop trigger if exists touch_monitoring_regression_alerts_v2_updated_at on public.monitoring_regression_alerts_v2;
create trigger touch_monitoring_regression_alerts_v2_updated_at
before update on public.monitoring_regression_alerts_v2
for each row execute function public.touch_monitoring_pro_v2_updated_at();
