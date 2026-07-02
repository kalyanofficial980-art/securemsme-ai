-- Mega Part 45: Continuous Monitoring Worker Foundation

create extension if not exists pgcrypto;

create table if not exists public.monitoring_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  seed_scan_id uuid references public.scans(id) on delete set null,
  website_url text not null,
  job_status text not null default 'active'
    check (job_status in ('active', 'paused', 'disabled')),
  cadence text not null default 'daily'
    check (cadence in ('daily', 'weekly', 'manual')),
  risk_threshold text not null default 'Medium risk',
  score_drop_threshold integer not null default 10 check (score_drop_threshold >= 1 and score_drop_threshold <= 100),
  monitoring_policy jsonb not null default '{}'::jsonb,
  latest_baseline_scan_id uuid references public.scans(id) on delete set null,
  latest_run_at timestamptz,
  next_run_at timestamptz,
  run_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monitoring_runs (
  id uuid primary key default gen_random_uuid(),
  monitoring_job_id uuid not null references public.monitoring_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,
  previous_scan_id uuid references public.scans(id) on delete set null,
  website_url text not null,
  run_status text not null default 'completed'
    check (run_status in ('completed', 'completed-with-warnings', 'failed')),
  worker_version text not null default '45.0',
  score_before integer,
  score_current integer not null default 0,
  score_delta integer,
  risk_before text,
  risk_current text,
  risk_transition text not null default 'no-previous-baseline'
    check (risk_transition in ('improved', 'worsened', 'same', 'no-previous-baseline', 'unknown')),
  drift_status text not null default 'stable'
    check (drift_status in ('stable', 'score-improved', 'score-dropped', 'risk-increased', 'needs-review')),
  regression_detected boolean not null default false,
  regression_reasons jsonb not null default '[]'::jsonb,
  run_summary jsonb not null default '{}'::jsonb,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.monitoring_events (
  id uuid primary key default gen_random_uuid(),
  monitoring_job_id uuid references public.monitoring_jobs(id) on delete cascade,
  monitoring_run_id uuid references public.monitoring_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  event_type text not null default 'monitoring-info'
    check (event_type in ('monitoring-info', 'score-drop', 'risk-increase', 'regression', 'baseline-updated', 'job-created', 'job-paused', 'job-resumed')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,
  acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists monitoring_jobs_user_id_idx on public.monitoring_jobs(user_id);
create index if not exists monitoring_jobs_website_id_idx on public.monitoring_jobs(website_id);
create index if not exists monitoring_jobs_status_idx on public.monitoring_jobs(job_status);
create index if not exists monitoring_jobs_next_run_at_idx on public.monitoring_jobs(next_run_at);
create index if not exists monitoring_runs_job_id_idx on public.monitoring_runs(monitoring_job_id);
create index if not exists monitoring_runs_user_id_idx on public.monitoring_runs(user_id);
create index if not exists monitoring_runs_website_id_idx on public.monitoring_runs(website_id);
create index if not exists monitoring_runs_created_at_idx on public.monitoring_runs(created_at desc);
create index if not exists monitoring_events_job_id_idx on public.monitoring_events(monitoring_job_id);
create index if not exists monitoring_events_user_id_idx on public.monitoring_events(user_id);
create index if not exists monitoring_events_event_type_idx on public.monitoring_events(event_type);

alter table public.monitoring_jobs enable row level security;
alter table public.monitoring_runs enable row level security;
alter table public.monitoring_events enable row level security;

drop policy if exists "Users and admins can read monitoring jobs" on public.monitoring_jobs;
create policy "Users and admins can read monitoring jobs"
on public.monitoring_jobs for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own monitoring jobs" on public.monitoring_jobs;
create policy "Users can insert own monitoring jobs"
on public.monitoring_jobs for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own monitoring jobs" on public.monitoring_jobs;
create policy "Users can update own monitoring jobs"
on public.monitoring_jobs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read monitoring runs" on public.monitoring_runs;
create policy "Users and admins can read monitoring runs"
on public.monitoring_runs for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own monitoring runs" on public.monitoring_runs;
create policy "Users can insert own monitoring runs"
on public.monitoring_runs for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read monitoring events" on public.monitoring_events;
create policy "Users and admins can read monitoring events"
on public.monitoring_events for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own monitoring events" on public.monitoring_events;
create policy "Users can insert own monitoring events"
on public.monitoring_events for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own monitoring events" on public.monitoring_events;
create policy "Users can update own monitoring events"
on public.monitoring_events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_monitoring_jobs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_monitoring_jobs_updated_at on public.monitoring_jobs;
create trigger set_monitoring_jobs_updated_at
before update on public.monitoring_jobs
for each row execute function public.set_monitoring_jobs_updated_at();
