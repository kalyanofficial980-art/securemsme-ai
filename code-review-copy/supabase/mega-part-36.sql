-- Mega Part 36: International Security Engine Core

create extension if not exists pgcrypto;

create table if not exists public.international_scan_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,

  target_url text not null,
  job_type text not null default 'international-security-engine'
    check (job_type in ('international-security-engine', 'scheduled-monitoring', 'retest-validation', 'authenticated-engine')),
  status text not null default 'planned'
    check (status in ('planned', 'queued', 'running', 'completed', 'completed-with-warnings', 'failed', 'blocked', 'cancelled')),
  intensity text not null default 'standard'
    check (intensity in ('light', 'standard', 'deep')),
  verified_scope boolean not null default false,

  app_classification jsonb not null default '{}'::jsonb,
  selected_modules jsonb not null default '[]'::jsonb,
  blocked_modules jsonb not null default '[]'::jsonb,
  coverage_matrix jsonb not null default '{}'::jsonb,
  risk_summary jsonb not null default '{}'::jsonb,
  standards_summary jsonb not null default '{}'::jsonb,
  safety_policy jsonb not null default '{}'::jsonb,
  execution_context jsonb not null default '{}'::jsonb,

  coverage_score integer not null default 0 check (coverage_score >= 0 and coverage_score <= 100),
  evidence_count integer not null default 0,
  vulnerability_count integer not null default 0,
  high_priority_count integer not null default 0,

  planned_at timestamptz not null default now(),
  queued_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.international_scan_job_modules (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,

  module_id text not null,
  module_name text not null,
  category text not null,
  stage text not null default 'planning',
  status text not null default 'planned'
    check (status in ('planned', 'queued', 'running', 'completed', 'failed', 'blocked', 'skipped')),
  required_scope text not null default 'public-safe',
  safe_methods jsonb not null default '["GET","HEAD"]'::jsonb,
  rate_limit jsonb not null default '{}'::jsonb,
  timeout_seconds integer not null default 30,
  dependencies jsonb not null default '[]'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,

  owasp_wstg jsonb not null default '[]'::jsonb,
  owasp_asvs jsonb not null default '[]'::jsonb,
  owasp_api_top10 jsonb not null default '[]'::jsonb,
  nist_ssdf jsonb not null default '[]'::jsonb,

  can_claim text not null,
  cannot_claim text not null,
  module_summary jsonb not null default '{}'::jsonb,
  error_message text,

  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.international_scan_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,

  event_type text not null default 'info'
    check (event_type in ('info', 'planned', 'queued', 'started', 'module-selected', 'module-blocked', 'evidence-created', 'vulnerability-created', 'completed', 'warning', 'error')),
  title text not null,
  details text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.normalized_security_evidence (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  module_id uuid references public.international_scan_job_modules(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,

  evidence_key text not null,
  source_module text not null,
  affected_asset text not null,
  asset_type text not null default 'web-url'
    check (asset_type in ('web-url', 'domain', 'subdomain', 'api-endpoint', 'auth-route', 'cms-component', 'header', 'tls', 'dns', 'cookie', 'javascript', 'form', 'parameter')),
  proof_type text not null default 'observation'
    check (proof_type in ('observation', 'header', 'response-status', 'tls-certificate', 'dns-record', 'technology-fingerprint', 'configuration', 'policy', 'metadata', 'manual-review')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  confidence text not null default 'Medium'
    check (confidence in ('High', 'Medium', 'Low')),
  false_positive_risk text not null default 'Medium'
    check (false_positive_risk in ('High', 'Medium', 'Low')),

  title text not null,
  observed_value text,
  expected_value text,
  evidence_summary text not null,
  business_impact text not null,
  developer_fix text not null,
  safe_claim text not null,
  blocked_claim text not null,

  standards jsonb not null default '{}'::jsonb,
  raw_metadata jsonb not null default '{}'::jsonb,
  retest_status text not null default 'not-retested'
    check (retest_status in ('not-retested', 'still-open', 'fixed', 'improved', 'accepted-risk', 'needs-review')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vulnerability_instances (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,

  vulnerability_key text not null,
  title text not null,
  category text not null,
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  confidence text not null default 'Medium'
    check (confidence in ('High', 'Medium', 'Low')),
  exploitability_score integer not null default 0 check (exploitability_score >= 0 and exploitability_score <= 100),
  business_impact_score integer not null default 0 check (business_impact_score >= 0 and business_impact_score <= 100),
  priority_score integer not null default 0 check (priority_score >= 0 and priority_score <= 100),

  lifecycle_status text not null default 'detected'
    check (lifecycle_status in ('detected', 'triaged', 'assigned', 'fixing', 'ready-for-retest', 'fixed', 'accepted-risk', 'false-positive')),
  affected_assets jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb,
  standards jsonb not null default '{}'::jsonb,

  business_impact text not null,
  developer_fix text not null,
  verification_guidance text not null,
  safe_claim text not null,
  blocked_claim text not null,

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  fixed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists international_scan_jobs_user_id_idx on public.international_scan_jobs(user_id);
create index if not exists international_scan_jobs_website_id_idx on public.international_scan_jobs(website_id);
create index if not exists international_scan_jobs_source_scan_id_idx on public.international_scan_jobs(source_scan_id);
create index if not exists international_scan_jobs_status_idx on public.international_scan_jobs(status);

create index if not exists international_scan_job_modules_job_id_idx on public.international_scan_job_modules(job_id);
create index if not exists international_scan_job_modules_user_id_idx on public.international_scan_job_modules(user_id);
create index if not exists international_scan_job_modules_status_idx on public.international_scan_job_modules(status);

create index if not exists international_scan_job_events_job_id_idx on public.international_scan_job_events(job_id);
create index if not exists international_scan_job_events_user_id_idx on public.international_scan_job_events(user_id);

create index if not exists normalized_security_evidence_job_id_idx on public.normalized_security_evidence(job_id);
create index if not exists normalized_security_evidence_user_id_idx on public.normalized_security_evidence(user_id);
create index if not exists normalized_security_evidence_website_id_idx on public.normalized_security_evidence(website_id);
create index if not exists normalized_security_evidence_severity_idx on public.normalized_security_evidence(severity);

create index if not exists vulnerability_instances_job_id_idx on public.vulnerability_instances(job_id);
create index if not exists vulnerability_instances_user_id_idx on public.vulnerability_instances(user_id);
create index if not exists vulnerability_instances_website_id_idx on public.vulnerability_instances(website_id);
create index if not exists vulnerability_instances_lifecycle_status_idx on public.vulnerability_instances(lifecycle_status);

alter table public.international_scan_jobs enable row level security;
alter table public.international_scan_job_modules enable row level security;
alter table public.international_scan_job_events enable row level security;
alter table public.normalized_security_evidence enable row level security;
alter table public.vulnerability_instances enable row level security;

drop policy if exists "Users and admins can read international scan jobs" on public.international_scan_jobs;
create policy "Users and admins can read international scan jobs"
on public.international_scan_jobs
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own international scan jobs" on public.international_scan_jobs;
create policy "Users can insert own international scan jobs"
on public.international_scan_jobs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own international scan jobs" on public.international_scan_jobs;
create policy "Users can update own international scan jobs"
on public.international_scan_jobs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read international scan job modules" on public.international_scan_job_modules;
create policy "Users and admins can read international scan job modules"
on public.international_scan_job_modules
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own international scan job modules" on public.international_scan_job_modules;
create policy "Users can insert own international scan job modules"
on public.international_scan_job_modules
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own international scan job modules" on public.international_scan_job_modules;
create policy "Users can update own international scan job modules"
on public.international_scan_job_modules
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read international scan job events" on public.international_scan_job_events;
create policy "Users and admins can read international scan job events"
on public.international_scan_job_events
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own international scan job events" on public.international_scan_job_events;
create policy "Users can insert own international scan job events"
on public.international_scan_job_events
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read normalized security evidence" on public.normalized_security_evidence;
create policy "Users and admins can read normalized security evidence"
on public.normalized_security_evidence
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own normalized security evidence" on public.normalized_security_evidence;
create policy "Users can insert own normalized security evidence"
on public.normalized_security_evidence
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own normalized security evidence" on public.normalized_security_evidence;
create policy "Users can update own normalized security evidence"
on public.normalized_security_evidence
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read vulnerability instances" on public.vulnerability_instances;
create policy "Users and admins can read vulnerability instances"
on public.vulnerability_instances
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own vulnerability instances" on public.vulnerability_instances;
create policy "Users can insert own vulnerability instances"
on public.vulnerability_instances
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own vulnerability instances" on public.vulnerability_instances;
create policy "Users can update own vulnerability instances"
on public.vulnerability_instances
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_international_engine_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_international_scan_jobs_updated_at on public.international_scan_jobs;
create trigger set_international_scan_jobs_updated_at
before update on public.international_scan_jobs
for each row
execute function public.set_international_engine_updated_at();

drop trigger if exists set_international_scan_job_modules_updated_at on public.international_scan_job_modules;
create trigger set_international_scan_job_modules_updated_at
before update on public.international_scan_job_modules
for each row
execute function public.set_international_engine_updated_at();

drop trigger if exists set_normalized_security_evidence_updated_at on public.normalized_security_evidence;
create trigger set_normalized_security_evidence_updated_at
before update on public.normalized_security_evidence
for each row
execute function public.set_international_engine_updated_at();

drop trigger if exists set_vulnerability_instances_updated_at on public.vulnerability_instances;
create trigger set_vulnerability_instances_updated_at
before update on public.vulnerability_instances
for each row
execute function public.set_international_engine_updated_at();
