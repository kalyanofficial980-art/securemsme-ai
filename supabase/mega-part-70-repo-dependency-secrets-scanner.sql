-- Mega Part 70: GitHub / Dependency / Secrets Scanner
-- Safe repository security foundation, package/dependency inventory and masked secret detection.
-- No token exfiltration, no exploit payloads, no cloning private repos.

create extension if not exists pgcrypto;

create table if not exists public.repo_security_projects_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,

  project_name text not null,
  repo_url text not null default '',
  repo_provider text not null default 'manual'
    check (repo_provider in ('manual', 'github', 'gitlab', 'bitbucket', 'other')),
  default_branch text not null default 'main',
  project_status text not null default 'active'
    check (project_status in ('active', 'paused', 'archived')),
  authorization_confirmed boolean not null default false,
  authorization_note text not null default '',

  latest_risk_score integer not null default 0 check (latest_risk_score >= 0 and latest_risk_score <= 100),
  latest_risk_level text not null default 'Info'
    check (latest_risk_level in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  latest_summary text not null default '',
  blocked_claims jsonb not null default '[]'::jsonb,
  project_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repo_dependency_scan_runs_v2 (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.repo_security_projects_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,

  run_status text not null default 'completed'
    check (run_status in ('queued', 'running', 'completed', 'failed', 'needs-review')),
  manifest_type text not null default 'package-json'
    check (manifest_type in ('package-json', 'npm-list', 'manual-list', 'unknown')),
  dependency_count integer not null default 0 check (dependency_count >= 0),
  risky_dependency_count integer not null default 0 check (risky_dependency_count >= 0),
  outdated_signal_count integer not null default 0 check (outdated_signal_count >= 0),
  dependency_risk_score integer not null default 0 check (dependency_risk_score >= 0 and dependency_risk_score <= 100),
  dependency_risk_level text not null default 'Info'
    check (dependency_risk_level in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  summary text not null default '',
  developer_action text not null default '',
  client_safe_summary text not null default '',
  raw_manifest_hash text not null default '',
  run_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.repo_dependency_items_v2 (
  id uuid primary key default gen_random_uuid(),
  dependency_run_id uuid not null references public.repo_dependency_scan_runs_v2(id) on delete cascade,
  project_id uuid not null references public.repo_security_projects_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  package_name text not null,
  current_version text not null default '',
  dependency_scope text not null default 'dependencies'
    check (dependency_scope in ('dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'manual')),
  risk_level text not null default 'Info'
    check (risk_level in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  risk_reason text not null default '',
  safe_fix text not null default '',
  confidence_level text not null default 'Medium'
    check (confidence_level in ('High', 'Medium', 'Low', 'Needs manual review')),
  item_status text not null default 'open'
    check (item_status in ('open', 'accepted-risk', 'fixed', 'false-positive', 'needs-review')),
  item_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.repo_secret_scan_runs_v2 (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.repo_security_projects_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,

  run_status text not null default 'completed'
    check (run_status in ('queued', 'running', 'completed', 'failed', 'needs-review')),
  scanned_text_hash text not null default '',
  scanned_line_count integer not null default 0 check (scanned_line_count >= 0),
  secret_signal_count integer not null default 0 check (secret_signal_count >= 0),
  high_confidence_secret_count integer not null default 0 check (high_confidence_secret_count >= 0),
  secret_risk_score integer not null default 0 check (secret_risk_score >= 0 and secret_risk_score <= 100),
  secret_risk_level text not null default 'Info'
    check (secret_risk_level in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  summary text not null default '',
  developer_action text not null default '',
  client_safe_summary text not null default '',
  run_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.repo_secret_findings_v2 (
  id uuid primary key default gen_random_uuid(),
  secret_run_id uuid not null references public.repo_secret_scan_runs_v2(id) on delete cascade,
  project_id uuid not null references public.repo_security_projects_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  secret_type text not null,
  masked_value text not null default '',
  file_hint text not null default 'manual-input',
  line_number integer,
  risk_level text not null default 'High'
    check (risk_level in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  confidence_level text not null default 'Medium'
    check (confidence_level in ('High', 'Medium', 'Low', 'Needs manual review')),
  evidence_summary text not null default '',
  developer_action text not null default '',
  finding_status text not null default 'open'
    check (finding_status in ('open', 'rotated', 'revoked', 'false-positive', 'accepted-risk', 'needs-review')),
  finding_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.repo_security_alerts_v2 (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.repo_security_projects_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,

  alert_type text not null default 'repo-risk'
    check (alert_type in ('repo-risk', 'dependency-risk', 'secret-risk', 'manual-review', 'safe-summary')),
  alert_status text not null default 'open'
    check (alert_status in ('open', 'acknowledged', 'resolved', 'archived')),
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  alert_title text not null,
  alert_body text not null default '',
  client_safe_summary text not null default '',
  developer_action text not null default '',
  alert_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.repo_security_events_v2 (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.repo_security_projects_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,

  event_type text not null default 'repo-event'
    check (event_type in ('project-created', 'dependency-scan-created', 'secret-scan-created', 'alert-created', 'finding-updated', 'repo-event')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists repo_security_projects_v2_user_id_idx on public.repo_security_projects_v2(user_id);
create index if not exists repo_dependency_scan_runs_v2_project_id_idx on public.repo_dependency_scan_runs_v2(project_id, created_at desc);
create index if not exists repo_dependency_items_v2_project_id_idx on public.repo_dependency_items_v2(project_id, created_at desc);
create index if not exists repo_secret_scan_runs_v2_project_id_idx on public.repo_secret_scan_runs_v2(project_id, created_at desc);
create index if not exists repo_secret_findings_v2_project_id_idx on public.repo_secret_findings_v2(project_id, created_at desc);
create index if not exists repo_security_alerts_v2_project_id_idx on public.repo_security_alerts_v2(project_id, created_at desc);
create index if not exists repo_security_events_v2_created_at_idx on public.repo_security_events_v2(created_at desc);

alter table public.repo_security_projects_v2 enable row level security;
alter table public.repo_dependency_scan_runs_v2 enable row level security;
alter table public.repo_dependency_items_v2 enable row level security;
alter table public.repo_secret_scan_runs_v2 enable row level security;
alter table public.repo_secret_findings_v2 enable row level security;
alter table public.repo_security_alerts_v2 enable row level security;
alter table public.repo_security_events_v2 enable row level security;

drop policy if exists "Users can read own repo projects v2" on public.repo_security_projects_v2;
create policy "Users can read own repo projects v2" on public.repo_security_projects_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own repo projects v2" on public.repo_security_projects_v2;
create policy "Users can insert own repo projects v2" on public.repo_security_projects_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own repo projects v2" on public.repo_security_projects_v2;
create policy "Users can update own repo projects v2" on public.repo_security_projects_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own repo dependency runs v2" on public.repo_dependency_scan_runs_v2;
create policy "Users can read own repo dependency runs v2" on public.repo_dependency_scan_runs_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own repo dependency runs v2" on public.repo_dependency_scan_runs_v2;
create policy "Users can insert own repo dependency runs v2" on public.repo_dependency_scan_runs_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own repo dependency items v2" on public.repo_dependency_items_v2;
create policy "Users can read own repo dependency items v2" on public.repo_dependency_items_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own repo dependency items v2" on public.repo_dependency_items_v2;
create policy "Users can insert own repo dependency items v2" on public.repo_dependency_items_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own repo secret runs v2" on public.repo_secret_scan_runs_v2;
create policy "Users can read own repo secret runs v2" on public.repo_secret_scan_runs_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own repo secret runs v2" on public.repo_secret_scan_runs_v2;
create policy "Users can insert own repo secret runs v2" on public.repo_secret_scan_runs_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own repo secret findings v2" on public.repo_secret_findings_v2;
create policy "Users can read own repo secret findings v2" on public.repo_secret_findings_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own repo secret findings v2" on public.repo_secret_findings_v2;
create policy "Users can insert own repo secret findings v2" on public.repo_secret_findings_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own repo secret findings v2" on public.repo_secret_findings_v2;
create policy "Users can update own repo secret findings v2" on public.repo_secret_findings_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own repo alerts v2" on public.repo_security_alerts_v2;
create policy "Users can read own repo alerts v2" on public.repo_security_alerts_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own repo alerts v2" on public.repo_security_alerts_v2;
create policy "Users can insert own repo alerts v2" on public.repo_security_alerts_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own repo alerts v2" on public.repo_security_alerts_v2;
create policy "Users can update own repo alerts v2" on public.repo_security_alerts_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own repo events v2" on public.repo_security_events_v2;
create policy "Users can read own repo events v2" on public.repo_security_events_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own repo events v2" on public.repo_security_events_v2;
create policy "Users can insert own repo events v2" on public.repo_security_events_v2
for insert to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_repo_security_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_repo_security_projects_v2_updated_at on public.repo_security_projects_v2;
create trigger touch_repo_security_projects_v2_updated_at
before update on public.repo_security_projects_v2
for each row execute function public.touch_repo_security_v2_updated_at();
