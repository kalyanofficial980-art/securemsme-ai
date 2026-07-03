-- Mega Part 25: Built-in Security Tool Runner Architecture

create extension if not exists pgcrypto;

create table if not exists public.security_tool_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,

  job_type text not null default 'report-tool-runner',
  tool_mode text not null default 'safe-passive'
    check (tool_mode in ('safe-passive', 'verified-passive', 'authorized-deep-passive')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),

  requested_tools jsonb not null default '[]'::jsonb,
  safe_boundary jsonb not null default '[]'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,

  total_tools integer not null default 0,
  completed_tools integer not null default 0,
  failed_tools integer not null default 0,
  blocked_tools integer not null default 0,

  started_at timestamptz,
  completed_at timestamptz,
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.security_tool_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.security_tool_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,

  tool_id text not null,
  tool_name text not null,
  tool_category text not null default 'Security',
  tool_mode text not null default 'safe-passive',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'skipped', 'blocked')),

  requires_verification boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,

  output_summary jsonb not null default '{}'::jsonb,
  evidence_count integer not null default 0,
  safe_boundary jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(job_id, tool_id)
);

create table if not exists public.security_tool_evidence (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.security_tool_jobs(id) on delete cascade,
  run_id uuid references public.security_tool_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,

  source_tool_id text not null,
  source_tool_name text not null,
  evidence_type text not null default 'public-evidence',
  title text not null,
  category text not null default 'Security',
  severity text not null default 'Info',
  status text not null default 'informational',
  confidence text not null default 'Medium',
  false_positive_risk text not null default 'Medium',

  raw_evidence jsonb not null default '[]'::jsonb,
  normalized_evidence text not null default '',
  claim_control jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists security_tool_jobs_user_id_idx on public.security_tool_jobs(user_id);
create index if not exists security_tool_jobs_website_id_idx on public.security_tool_jobs(website_id);
create index if not exists security_tool_jobs_scan_id_idx on public.security_tool_jobs(scan_id);
create index if not exists security_tool_jobs_status_idx on public.security_tool_jobs(status);

create index if not exists security_tool_runs_job_id_idx on public.security_tool_runs(job_id);
create index if not exists security_tool_runs_user_id_idx on public.security_tool_runs(user_id);
create index if not exists security_tool_runs_scan_id_idx on public.security_tool_runs(scan_id);
create index if not exists security_tool_runs_tool_id_idx on public.security_tool_runs(tool_id);

create index if not exists security_tool_evidence_job_id_idx on public.security_tool_evidence(job_id);
create index if not exists security_tool_evidence_run_id_idx on public.security_tool_evidence(run_id);
create index if not exists security_tool_evidence_user_id_idx on public.security_tool_evidence(user_id);
create index if not exists security_tool_evidence_scan_id_idx on public.security_tool_evidence(scan_id);

alter table public.security_tool_jobs enable row level security;
alter table public.security_tool_runs enable row level security;
alter table public.security_tool_evidence enable row level security;

drop policy if exists "Users can read own security tool jobs" on public.security_tool_jobs;
create policy "Users can read own security tool jobs"
on public.security_tool_jobs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own security tool jobs" on public.security_tool_jobs;
create policy "Users can insert own security tool jobs"
on public.security_tool_jobs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own security tool jobs" on public.security_tool_jobs;
create policy "Users can update own security tool jobs"
on public.security_tool_jobs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own security tool runs" on public.security_tool_runs;
create policy "Users can read own security tool runs"
on public.security_tool_runs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own security tool runs" on public.security_tool_runs;
create policy "Users can insert own security tool runs"
on public.security_tool_runs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own security tool runs" on public.security_tool_runs;
create policy "Users can update own security tool runs"
on public.security_tool_runs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own security tool evidence" on public.security_tool_evidence;
create policy "Users can read own security tool evidence"
on public.security_tool_evidence
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own security tool evidence" on public.security_tool_evidence;
create policy "Users can insert own security tool evidence"
on public.security_tool_evidence
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.set_security_tool_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status = 'running' and old.status is distinct from 'running' then
    new.started_at = now();
  end if;

  if new.status in ('completed', 'failed', 'cancelled') and old.status is distinct from new.status then
    new.completed_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_security_tool_jobs_updated_at on public.security_tool_jobs;
create trigger set_security_tool_jobs_updated_at
before update on public.security_tool_jobs
for each row
execute function public.set_security_tool_updated_at();

drop trigger if exists set_security_tool_runs_updated_at on public.security_tool_runs;
create trigger set_security_tool_runs_updated_at
before update on public.security_tool_runs
for each row
execute function public.set_security_tool_updated_at();
