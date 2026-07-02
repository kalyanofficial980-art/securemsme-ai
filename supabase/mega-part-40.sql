-- Mega Part 40: GraphQL Risk Analyzer

create extension if not exists pgcrypto;

create table if not exists public.graphql_security_inventories (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,

  target_url text not null,
  analyzer_status text not null default 'completed'
    check (analyzer_status in ('planned', 'running', 'completed', 'completed-with-warnings', 'blocked', 'failed')),
  analyzer_policy jsonb not null default '{}'::jsonb,
  endpoint_observations jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,

  endpoint_count integer not null default 0,
  ide_signal_count integer not null default 0,
  introspection_signal_count integer not null default 0,
  auth_unknown_count integer not null default 0,
  sensitive_keyword_count integer not null default 0,
  mutation_signal_count integer not null default 0,
  graphql_risk_signal_count integer not null default 0,
  blocked_execution_count integer not null default 0,
  graphql_risk_score integer not null default 0 check (graphql_risk_score >= 0 and graphql_risk_score <= 100),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.graphql_security_findings (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.graphql_security_inventories(id) on delete cascade,
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
  api_top10_mapping jsonb not null default '[]'::jsonb,
  evidence_summary text not null,
  business_impact text not null,
  developer_fix text not null,
  safe_claim text not null,
  blocked_claim text not null,
  standards jsonb not null default '{}'::jsonb,
  evidence_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists graphql_security_inventories_job_id_idx on public.graphql_security_inventories(job_id);
create index if not exists graphql_security_inventories_user_id_idx on public.graphql_security_inventories(user_id);
create index if not exists graphql_security_inventories_website_id_idx on public.graphql_security_inventories(website_id);

create index if not exists graphql_security_findings_inventory_id_idx on public.graphql_security_findings(inventory_id);
create index if not exists graphql_security_findings_job_id_idx on public.graphql_security_findings(job_id);
create index if not exists graphql_security_findings_user_id_idx on public.graphql_security_findings(user_id);
create index if not exists graphql_security_findings_category_idx on public.graphql_security_findings(category);
create index if not exists graphql_security_findings_severity_idx on public.graphql_security_findings(severity);

alter table public.graphql_security_inventories enable row level security;
alter table public.graphql_security_findings enable row level security;

drop policy if exists "Users and admins can read graphql security inventories" on public.graphql_security_inventories;
create policy "Users and admins can read graphql security inventories"
on public.graphql_security_inventories
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own graphql security inventories" on public.graphql_security_inventories;
create policy "Users can insert own graphql security inventories"
on public.graphql_security_inventories
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own graphql security inventories" on public.graphql_security_inventories;
create policy "Users can update own graphql security inventories"
on public.graphql_security_inventories
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read graphql security findings" on public.graphql_security_findings;
create policy "Users and admins can read graphql security findings"
on public.graphql_security_findings
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own graphql security findings" on public.graphql_security_findings;
create policy "Users can insert own graphql security findings"
on public.graphql_security_findings
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.set_graphql_security_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_graphql_security_inventories_updated_at on public.graphql_security_inventories;
create trigger set_graphql_security_inventories_updated_at
before update on public.graphql_security_inventories
for each row
execute function public.set_graphql_security_updated_at();
