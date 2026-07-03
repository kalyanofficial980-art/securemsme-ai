-- Mega Part 42: Broken Access Control Signal Engine

create extension if not exists pgcrypto;

create table if not exists public.access_control_review_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,
  authenticated_scan_request_id uuid references public.authenticated_scan_requests(id) on delete set null,

  target_url text not null,
  review_status text not null default 'completed'
    check (review_status in ('planned', 'running', 'completed', 'completed-with-warnings', 'blocked', 'failed')),
  comparison_mode text not null default 'low-privilege-metadata'
    check (comparison_mode in ('low-privilege-metadata', 'dual-role-metadata')),
  review_policy jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,

  route_review_count integer not null default 0,
  comparison_count integer not null default 0,
  sensitive_route_signal_count integer not null default 0,
  admin_route_signal_count integer not null default 0,
  object_id_signal_count integer not null default 0,
  unexpected_access_signal_count integer not null default 0,
  blocked_route_count integer not null default 0,
  private_evidence_block_count integer not null default 0,
  high_risk_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_control_route_comparisons (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.access_control_review_runs(id) on delete cascade,
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,

  url text not null,
  path text not null,
  expected_access text not null default 'unknown'
    check (expected_access in ('public-ok', 'authenticated-ok', 'low-privilege-ok', 'privileged-only', 'admin-only', 'blocked', 'unknown')),
  low_role_status integer,
  high_role_status integer,
  comparison_result text not null default 'needs-review'
    check (comparison_result in ('expected', 'needs-review', 'blocked', 'not-tested', 'potential-bac-signal')),
  risk_level text not null default 'Info'
    check (risk_level in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  risk_signals jsonb not null default '[]'::jsonb,
  object_id_signals jsonb not null default '[]'::jsonb,
  route_sensitivity text not null default 'medium'
    check (route_sensitivity in ('low', 'medium', 'high')),
  evidence_metadata jsonb not null default '{}'::jsonb,
  private_body_stored boolean not null default false,

  created_at timestamptz not null default now()
);

create table if not exists public.access_control_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.access_control_review_runs(id) on delete cascade,
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,

  category text not null,
  title text not null,
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  confidence text not null default 'Medium'
    check (confidence in ('High', 'Medium', 'Low')),
  affected_url text not null,
  observed_value text,
  expected_value text,
  risk_signals jsonb not null default '[]'::jsonb,
  evidence_summary text not null,
  business_impact text not null,
  developer_fix text not null,
  safe_claim text not null,
  blocked_claim text not null,
  standards jsonb not null default '{}'::jsonb,
  evidence_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists access_control_review_runs_job_id_idx on public.access_control_review_runs(job_id);
create index if not exists access_control_review_runs_user_id_idx on public.access_control_review_runs(user_id);
create index if not exists access_control_review_runs_website_id_idx on public.access_control_review_runs(website_id);
create index if not exists access_control_review_runs_source_scan_id_idx on public.access_control_review_runs(source_scan_id);

create index if not exists access_control_route_comparisons_run_id_idx on public.access_control_route_comparisons(run_id);
create index if not exists access_control_route_comparisons_job_id_idx on public.access_control_route_comparisons(job_id);
create index if not exists access_control_route_comparisons_user_id_idx on public.access_control_route_comparisons(user_id);
create index if not exists access_control_route_comparisons_result_idx on public.access_control_route_comparisons(comparison_result);
create index if not exists access_control_route_comparisons_risk_idx on public.access_control_route_comparisons(risk_level);

create index if not exists access_control_findings_run_id_idx on public.access_control_findings(run_id);
create index if not exists access_control_findings_job_id_idx on public.access_control_findings(job_id);
create index if not exists access_control_findings_user_id_idx on public.access_control_findings(user_id);
create index if not exists access_control_findings_category_idx on public.access_control_findings(category);
create index if not exists access_control_findings_severity_idx on public.access_control_findings(severity);

alter table public.access_control_review_runs enable row level security;
alter table public.access_control_route_comparisons enable row level security;
alter table public.access_control_findings enable row level security;

drop policy if exists "Users and admins can read access control review runs" on public.access_control_review_runs;
create policy "Users and admins can read access control review runs"
on public.access_control_review_runs
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own access control review runs" on public.access_control_review_runs;
create policy "Users can insert own access control review runs"
on public.access_control_review_runs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own access control review runs" on public.access_control_review_runs;
create policy "Users can update own access control review runs"
on public.access_control_review_runs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read access control route comparisons" on public.access_control_route_comparisons;
create policy "Users and admins can read access control route comparisons"
on public.access_control_route_comparisons
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own access control route comparisons" on public.access_control_route_comparisons;
create policy "Users can insert own access control route comparisons"
on public.access_control_route_comparisons
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read access control findings" on public.access_control_findings;
create policy "Users and admins can read access control findings"
on public.access_control_findings
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own access control findings" on public.access_control_findings;
create policy "Users can insert own access control findings"
on public.access_control_findings
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.set_access_control_review_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_access_control_review_runs_updated_at on public.access_control_review_runs;
create trigger set_access_control_review_runs_updated_at
before update on public.access_control_review_runs
for each row
execute function public.set_access_control_review_updated_at();
