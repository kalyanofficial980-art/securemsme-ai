-- Mega Part 41: Authenticated Session-Safe Crawler Execution

create extension if not exists pgcrypto;

create table if not exists public.authenticated_crawler_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,
  authenticated_scan_request_id uuid references public.authenticated_scan_requests(id) on delete set null,

  target_url text not null,
  run_status text not null default 'completed'
    check (run_status in ('planned', 'running', 'completed', 'completed-with-warnings', 'blocked', 'failed')),
  execution_mode text not null default 'metadata-only'
    check (execution_mode in ('metadata-only', 'short-lived-cookie-in-memory', 'short-lived-authorization-in-memory')),
  crawler_policy jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,

  authenticated_route_count integer not null default 0,
  blocked_route_count integer not null default 0,
  form_count integer not null default 0,
  input_count integer not null default 0,
  auth_signal_count integer not null default 0,
  sensitive_route_count integer not null default 0,
  private_evidence_block_count integer not null default 0,
  high_risk_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.authenticated_route_observations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.authenticated_crawler_runs(id) on delete cascade,
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,

  url text not null,
  path text not null,
  method text not null default 'GET',
  status_code integer,
  content_type text,
  title text,
  route_type text not null default 'authenticated-route'
    check (route_type in ('authenticated-route', 'blocked-route', 'form-surface', 'input-surface', 'auth-signal', 'sensitive-route')),
  auth_signal text,
  sensitivity text not null default 'medium'
    check (sensitivity in ('low', 'medium', 'high')),
  forms_metadata jsonb not null default '[]'::jsonb,
  links_discovered integer not null default 0,
  blocked_reason text,
  private_body_stored boolean not null default false,
  evidence_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists authenticated_crawler_runs_job_id_idx on public.authenticated_crawler_runs(job_id);
create index if not exists authenticated_crawler_runs_user_id_idx on public.authenticated_crawler_runs(user_id);
create index if not exists authenticated_crawler_runs_website_id_idx on public.authenticated_crawler_runs(website_id);
create index if not exists authenticated_crawler_runs_source_scan_id_idx on public.authenticated_crawler_runs(source_scan_id);

create index if not exists authenticated_route_observations_run_id_idx on public.authenticated_route_observations(run_id);
create index if not exists authenticated_route_observations_job_id_idx on public.authenticated_route_observations(job_id);
create index if not exists authenticated_route_observations_user_id_idx on public.authenticated_route_observations(user_id);
create index if not exists authenticated_route_observations_route_type_idx on public.authenticated_route_observations(route_type);
create index if not exists authenticated_route_observations_sensitivity_idx on public.authenticated_route_observations(sensitivity);

alter table public.authenticated_crawler_runs enable row level security;
alter table public.authenticated_route_observations enable row level security;

drop policy if exists "Users and admins can read authenticated crawler runs" on public.authenticated_crawler_runs;
create policy "Users and admins can read authenticated crawler runs"
on public.authenticated_crawler_runs
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own authenticated crawler runs" on public.authenticated_crawler_runs;
create policy "Users can insert own authenticated crawler runs"
on public.authenticated_crawler_runs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own authenticated crawler runs" on public.authenticated_crawler_runs;
create policy "Users can update own authenticated crawler runs"
on public.authenticated_crawler_runs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read authenticated route observations" on public.authenticated_route_observations;
create policy "Users and admins can read authenticated route observations"
on public.authenticated_route_observations
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own authenticated route observations" on public.authenticated_route_observations;
create policy "Users can insert own authenticated route observations"
on public.authenticated_route_observations
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.set_authenticated_crawler_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_authenticated_crawler_runs_updated_at on public.authenticated_crawler_runs;
create trigger set_authenticated_crawler_runs_updated_at
before update on public.authenticated_crawler_runs
for each row
execute function public.set_authenticated_crawler_updated_at();
