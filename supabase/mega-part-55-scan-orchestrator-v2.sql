-- Mega Part 55: Scan Orchestrator v2 + Engine Execution Pipeline
-- Defensive scan pipeline for authorized safe security review engines.

create extension if not exists pgcrypto;

create table if not exists public.scan_engine_registry (
  id uuid primary key default gen_random_uuid(),

  engine_key text not null unique,
  engine_name text not null,
  engine_group text not null default 'core',
  engine_type text not null default 'safe-observation'
    check (engine_type in (
      'safe-observation',
      'crawler',
      'browser-security',
      'api-security',
      'cms-ecommerce',
      'auth-safe-review',
      'accuracy',
      'reporting',
      'monitoring'
    )),
  description text not null default '',
  default_enabled boolean not null default true,
  requires_verified_scope boolean not null default false,
  requires_authenticated_context boolean not null default false,
  safe_methods text[] not null default array['GET','HEAD'],
  blocked_actions text[] not null default array[
    'no exploit payloads',
    'no brute force',
    'no login bypass',
    'no destructive testing',
    'no private data extraction'
  ],
  timeout_seconds integer not null default 30 check (timeout_seconds >= 5 and timeout_seconds <= 300),
  max_retries integer not null default 1 check (max_retries >= 0 and max_retries <= 5),
  weight integer not null default 10 check (weight >= 1 and weight <= 100),
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scan_orchestrator_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  target_url text not null,
  job_name text not null default 'Security scan pipeline',
  job_status text not null default 'queued'
    check (job_status in ('queued', 'running', 'completed', 'completed-with-warnings', 'blocked', 'failed', 'cancelled')),
  scan_mode text not null default 'safe-standard'
    check (scan_mode in ('safe-light', 'safe-standard', 'safe-deep', 'authenticated-safe')),
  authorization_status text not null default 'user-attested'
    check (authorization_status in ('user-attested', 'verified-scope', 'authenticated-safe-approved', 'blocked')),

  total_engines integer not null default 0,
  completed_engines integer not null default 0,
  failed_engines integer not null default 0,
  blocked_engines integer not null default 0,
  skipped_engines integer not null default 0,
  coverage_percent integer not null default 0 check (coverage_percent >= 0 and coverage_percent <= 100),
  weighted_coverage_percent integer not null default 0 check (weighted_coverage_percent >= 0 and weighted_coverage_percent <= 100),

  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  progress_message text not null default 'Pipeline queued.',
  safe_summary text not null default '',
  developer_summary text not null default '',
  blocked_reason text,

  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scan_orchestrator_engine_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.scan_orchestrator_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  engine_key text not null,
  engine_name text not null,
  engine_group text not null default 'core',
  engine_type text not null default 'safe-observation',
  run_order integer not null default 1,

  run_status text not null default 'queued'
    check (run_status in ('queued', 'running', 'completed', 'completed-with-warnings', 'blocked', 'failed', 'skipped')),
  retry_count integer not null default 0 check (retry_count >= 0 and retry_count <= 10),
  coverage_weight integer not null default 10 check (coverage_weight >= 1 and coverage_weight <= 100),

  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  status_message text not null default '',
  safe_summary text not null default '',
  evidence_summary text not null default '',
  error_message text,

  observations_count integer not null default 0,
  findings_created_count integer not null default 0,
  potential_findings_count integer not null default 0,
  confirmed_findings_count integer not null default 0,

  engine_config jsonb not null default '{}'::jsonb,
  engine_result jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scan_orchestrator_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.scan_orchestrator_jobs(id) on delete cascade,
  engine_run_id uuid references public.scan_orchestrator_engine_runs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  event_type text not null default 'pipeline-event'
    check (event_type in (
      'pipeline-created',
      'pipeline-started',
      'pipeline-completed',
      'pipeline-blocked',
      'engine-started',
      'engine-completed',
      'engine-failed',
      'engine-skipped',
      'engine-retried',
      'coverage-updated',
      'pipeline-event'
    )),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists scan_engine_registry_engine_key_idx on public.scan_engine_registry(engine_key);
create index if not exists scan_engine_registry_group_idx on public.scan_engine_registry(engine_group);
create index if not exists scan_engine_registry_active_idx on public.scan_engine_registry(is_active);

create index if not exists scan_orchestrator_jobs_user_id_idx on public.scan_orchestrator_jobs(user_id);
create index if not exists scan_orchestrator_jobs_scan_id_idx on public.scan_orchestrator_jobs(scan_id);
create index if not exists scan_orchestrator_jobs_status_idx on public.scan_orchestrator_jobs(job_status);
create index if not exists scan_orchestrator_jobs_created_at_idx on public.scan_orchestrator_jobs(created_at desc);

create index if not exists scan_orchestrator_engine_runs_job_id_idx on public.scan_orchestrator_engine_runs(job_id);
create index if not exists scan_orchestrator_engine_runs_scan_id_idx on public.scan_orchestrator_engine_runs(scan_id);
create index if not exists scan_orchestrator_engine_runs_status_idx on public.scan_orchestrator_engine_runs(run_status);
create index if not exists scan_orchestrator_engine_runs_engine_key_idx on public.scan_orchestrator_engine_runs(engine_key);

create index if not exists scan_orchestrator_events_job_id_idx on public.scan_orchestrator_events(job_id);
create index if not exists scan_orchestrator_events_created_at_idx on public.scan_orchestrator_events(created_at desc);

alter table public.scan_engine_registry enable row level security;
alter table public.scan_orchestrator_jobs enable row level security;
alter table public.scan_orchestrator_engine_runs enable row level security;
alter table public.scan_orchestrator_events enable row level security;

drop policy if exists "Authenticated users can read engine registry" on public.scan_engine_registry;
create policy "Authenticated users can read engine registry"
on public.scan_engine_registry
for select
to authenticated
using (is_active = true or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can manage engine registry" on public.scan_engine_registry;
create policy "Admins can manage engine registry"
on public.scan_engine_registry
for all
to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own orchestrator jobs" on public.scan_orchestrator_jobs;
create policy "Users can read own orchestrator jobs"
on public.scan_orchestrator_jobs
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own orchestrator jobs" on public.scan_orchestrator_jobs;
create policy "Users can insert own orchestrator jobs"
on public.scan_orchestrator_jobs
for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can update own orchestrator jobs" on public.scan_orchestrator_jobs;
create policy "Users can update own orchestrator jobs"
on public.scan_orchestrator_jobs
for update
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
)
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can read own orchestrator engine runs" on public.scan_orchestrator_engine_runs;
create policy "Users can read own orchestrator engine runs"
on public.scan_orchestrator_engine_runs
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own orchestrator engine runs" on public.scan_orchestrator_engine_runs;
create policy "Users can insert own orchestrator engine runs"
on public.scan_orchestrator_engine_runs
for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can update own orchestrator engine runs" on public.scan_orchestrator_engine_runs;
create policy "Users can update own orchestrator engine runs"
on public.scan_orchestrator_engine_runs
for update
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
)
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can read own orchestrator events" on public.scan_orchestrator_events;
create policy "Users can read own orchestrator events"
on public.scan_orchestrator_events
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own orchestrator events" on public.scan_orchestrator_events;
create policy "Users can insert own orchestrator events"
on public.scan_orchestrator_events
for insert
to authenticated
with check (
  user_id is null
  or auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

create or replace function public.touch_scan_orchestrator_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_scan_engine_registry_updated_at on public.scan_engine_registry;
create trigger touch_scan_engine_registry_updated_at
before update on public.scan_engine_registry
for each row
execute function public.touch_scan_orchestrator_updated_at();

drop trigger if exists touch_scan_orchestrator_jobs_updated_at on public.scan_orchestrator_jobs;
create trigger touch_scan_orchestrator_jobs_updated_at
before update on public.scan_orchestrator_jobs
for each row
execute function public.touch_scan_orchestrator_updated_at();

drop trigger if exists touch_scan_orchestrator_engine_runs_updated_at on public.scan_orchestrator_engine_runs;
create trigger touch_scan_orchestrator_engine_runs_updated_at
before update on public.scan_orchestrator_engine_runs
for each row
execute function public.touch_scan_orchestrator_updated_at();

create or replace function public.recalculate_scan_orchestrator_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_completed integer;
  v_failed integer;
  v_blocked integer;
  v_skipped integer;
  v_total_weight integer;
  v_completed_weight integer;
  v_coverage integer;
  v_weighted integer;
  v_status text;
  v_message text;
begin
  select
    count(*),
    count(*) filter (where run_status in ('completed', 'completed-with-warnings')),
    count(*) filter (where run_status = 'failed'),
    count(*) filter (where run_status = 'blocked'),
    count(*) filter (where run_status = 'skipped'),
    coalesce(sum(coverage_weight), 0),
    coalesce(sum(coverage_weight) filter (where run_status in ('completed', 'completed-with-warnings')), 0)
  into
    v_total, v_completed, v_failed, v_blocked, v_skipped, v_total_weight, v_completed_weight
  from public.scan_orchestrator_engine_runs
  where job_id = p_job_id;

  if coalesce(v_total, 0) = 0 then
    v_coverage := 0;
    v_weighted := 0;
  else
    v_coverage := round((coalesce(v_completed, 0)::numeric / v_total::numeric) * 100);
    if coalesce(v_total_weight, 0) = 0 then
      v_weighted := v_coverage;
    else
      v_weighted := round((coalesce(v_completed_weight, 0)::numeric / v_total_weight::numeric) * 100);
    end if;
  end if;

  if coalesce(v_total, 0) = 0 then
    v_status := 'queued';
    v_message := 'Pipeline queued.';
  elsif v_blocked = v_total then
    v_status := 'blocked';
    v_message := 'All engines blocked by scope or authorization rules.';
  elsif (v_completed + v_failed + v_blocked + v_skipped) < v_total then
    v_status := 'running';
    v_message := v_completed || '/' || v_total || ' engines completed.';
  elsif v_failed > 0 or v_blocked > 0 then
    v_status := 'completed-with-warnings';
    v_message := v_completed || '/' || v_total || ' engines completed with warnings.';
  else
    v_status := 'completed';
    v_message := 'All planned engines completed.';
  end if;

  update public.scan_orchestrator_jobs
  set
    job_status = v_status,
    total_engines = coalesce(v_total, 0),
    completed_engines = coalesce(v_completed, 0),
    failed_engines = coalesce(v_failed, 0),
    blocked_engines = coalesce(v_blocked, 0),
    skipped_engines = coalesce(v_skipped, 0),
    coverage_percent = v_coverage,
    weighted_coverage_percent = v_weighted,
    progress_message = v_message,
    completed_at = case when v_status in ('completed', 'completed-with-warnings', 'blocked', 'failed') then now() else completed_at end,
    updated_at = now()
  where id = p_job_id;
end;
$$;

insert into public.scan_engine_registry (
  engine_key,
  engine_name,
  engine_group,
  engine_type,
  description,
  default_enabled,
  requires_verified_scope,
  requires_authenticated_context,
  safe_methods,
  timeout_seconds,
  max_retries,
  weight
)
values
  ('scope-authorization', 'Scope Authorization Gate', 'governance', 'safe-observation', 'Checks authorization and safe testing scope before deeper engines run.', true, false, false, array['READ'], 10, 0, 8),
  ('passive-recon', 'Passive Recon Engine', 'discovery', 'safe-observation', 'Collects safe public observations without exploitation.', true, false, false, array['GET','HEAD'], 20, 1, 8),
  ('crawler-discovery', 'Crawler Discovery Engine', 'discovery', 'crawler', 'Discovers public pages, links, forms and surface signals with safe crawling.', true, false, false, array['GET'], 45, 1, 12),
  ('browser-security', 'Browser Security Engine', 'browser', 'browser-security', 'Reviews CSP, HSTS, clickjacking, cookies, CORS and browser-side controls.', true, false, false, array['GET','HEAD'], 30, 1, 12),
  ('vulnerability-bug-finder', 'Vulnerability Scanner + Bug Finder', 'vulnerability', 'safe-observation', 'Creates evidence-based bug/risk findings with developer fix and retest guidance.', true, false, false, array['GET','HEAD'], 60, 1, 18),
  ('api-security-discovery', 'API Security Discovery Engine', 'api', 'api-security', 'Finds OpenAPI, Swagger, GraphQL and API exposure signals.', true, false, false, array['GET','HEAD'], 45, 1, 12),
  ('cms-ecommerce-risk', 'CMS + Ecommerce Risk Engine', 'cms-ecommerce', 'cms-ecommerce', 'Reviews WordPress/WooCommerce, checkout, payment and customer account signals.', true, false, false, array['GET','HEAD'], 45, 1, 10),
  ('customer-data-risk', 'Customer Data Risk Engine', 'data-protection', 'safe-observation', 'Reviews forms, privacy pages and customer-data collection risk signals.', true, false, false, array['GET'], 30, 1, 10),
  ('authenticated-safe-review', 'Authenticated Safe Review Engine', 'authenticated', 'auth-safe-review', 'Safely reviews login-protected areas only after authenticated scope approval.', false, true, true, array['GET'], 60, 1, 10),
  ('accuracy-foundation', 'Accuracy Foundation Engine', 'accuracy', 'accuracy', 'Classifies findings, scores confidence and queues expert review.', true, false, false, array['READ'], 20, 1, 12),
  ('report-builder', 'Report Builder Engine', 'reporting', 'reporting', 'Builds client-safe report sections, developer fix plan and blocked claims.', true, false, false, array['READ'], 20, 1, 8),
  ('monitoring-setup', 'Monitoring Setup Engine', 'monitoring', 'monitoring', 'Prepares monitoring signals, alerts and future rescan schedule.', true, false, false, array['READ'], 20, 1, 8)
on conflict (engine_key) do update set
  engine_name = excluded.engine_name,
  engine_group = excluded.engine_group,
  engine_type = excluded.engine_type,
  description = excluded.description,
  default_enabled = excluded.default_enabled,
  requires_verified_scope = excluded.requires_verified_scope,
  requires_authenticated_context = excluded.requires_authenticated_context,
  safe_methods = excluded.safe_methods,
  timeout_seconds = excluded.timeout_seconds,
  max_retries = excluded.max_retries,
  weight = excluded.weight,
  updated_at = now();
