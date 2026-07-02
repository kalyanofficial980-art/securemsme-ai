-- Mega Part 46: Background Job Queue + Worker Scheduler

create extension if not exists pgcrypto;

create table if not exists public.background_worker_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  monitoring_job_id uuid references public.monitoring_jobs(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,

  job_type text not null default 'monitoring-evaluation'
    check (job_type in ('monitoring-evaluation', 'monitoring-rescan-placeholder', 'score-consistency', 'truth-cleanup', 'custom')),
  job_status text not null default 'queued'
    check (job_status in ('queued', 'locked', 'running', 'completed', 'failed', 'retrying', 'cancelled')),
  priority integer not null default 5 check (priority >= 1 and priority <= 10),
  run_after timestamptz not null default now(),

  attempts integer not null default 0,
  max_attempts integer not null default 3 check (max_attempts >= 1 and max_attempts <= 10),
  locked_at timestamptz,
  locked_by text,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  last_error text,

  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  worker_version text not null default '46.0',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.background_worker_attempts (
  id uuid primary key default gen_random_uuid(),
  worker_job_id uuid not null references public.background_worker_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,

  attempt_number integer not null default 1,
  attempt_status text not null default 'running'
    check (attempt_status in ('running', 'completed', 'failed', 'skipped')),
  worker_id text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  error_message text,
  output_summary jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.background_worker_events (
  id uuid primary key default gen_random_uuid(),
  worker_job_id uuid references public.background_worker_jobs(id) on delete cascade,
  worker_attempt_id uuid references public.background_worker_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,

  event_type text not null default 'queue-info'
    check (event_type in ('queue-info', 'job-enqueued', 'job-locked', 'job-started', 'job-completed', 'job-failed', 'job-retry', 'job-cancelled', 'scheduler-run')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists background_worker_jobs_user_id_idx on public.background_worker_jobs(user_id);
create index if not exists background_worker_jobs_website_id_idx on public.background_worker_jobs(website_id);
create index if not exists background_worker_jobs_monitoring_job_id_idx on public.background_worker_jobs(monitoring_job_id);
create index if not exists background_worker_jobs_source_scan_id_idx on public.background_worker_jobs(source_scan_id);
create index if not exists background_worker_jobs_status_idx on public.background_worker_jobs(job_status);
create index if not exists background_worker_jobs_type_idx on public.background_worker_jobs(job_type);
create index if not exists background_worker_jobs_run_after_idx on public.background_worker_jobs(run_after);
create index if not exists background_worker_jobs_priority_idx on public.background_worker_jobs(priority desc);

create index if not exists background_worker_attempts_job_id_idx on public.background_worker_attempts(worker_job_id);
create index if not exists background_worker_attempts_user_id_idx on public.background_worker_attempts(user_id);
create index if not exists background_worker_attempts_status_idx on public.background_worker_attempts(attempt_status);

create index if not exists background_worker_events_job_id_idx on public.background_worker_events(worker_job_id);
create index if not exists background_worker_events_user_id_idx on public.background_worker_events(user_id);
create index if not exists background_worker_events_event_type_idx on public.background_worker_events(event_type);
create index if not exists background_worker_events_created_at_idx on public.background_worker_events(created_at desc);

alter table public.background_worker_jobs enable row level security;
alter table public.background_worker_attempts enable row level security;
alter table public.background_worker_events enable row level security;

drop policy if exists "Users and admins can read background jobs" on public.background_worker_jobs;
create policy "Users and admins can read background jobs"
on public.background_worker_jobs
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own background jobs" on public.background_worker_jobs;
create policy "Users can insert own background jobs"
on public.background_worker_jobs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own background jobs" on public.background_worker_jobs;
create policy "Users can update own background jobs"
on public.background_worker_jobs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read background attempts" on public.background_worker_attempts;
create policy "Users and admins can read background attempts"
on public.background_worker_attempts
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own background attempts" on public.background_worker_attempts;
create policy "Users can insert own background attempts"
on public.background_worker_attempts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own background attempts" on public.background_worker_attempts;
create policy "Users can update own background attempts"
on public.background_worker_attempts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read background events" on public.background_worker_events;
create policy "Users and admins can read background events"
on public.background_worker_events
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own background events" on public.background_worker_events;
create policy "Users can insert own background events"
on public.background_worker_events
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.set_background_worker_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_background_worker_jobs_updated_at on public.background_worker_jobs;
create trigger set_background_worker_jobs_updated_at
before update on public.background_worker_jobs
for each row
execute function public.set_background_worker_jobs_updated_at();
