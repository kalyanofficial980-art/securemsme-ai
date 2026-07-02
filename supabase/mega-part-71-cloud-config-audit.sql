-- Mega Part 71: Cloud Config Audit for Supabase / Vercel / DNS
-- Manual cloud configuration security audit foundation.
-- No cloud API tokens, no private keys, no secrets collected.

create extension if not exists pgcrypto;

create table if not exists public.cloud_config_projects_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,

  project_name text not null,
  production_domain text not null default '',
  supabase_project_ref text not null default '',
  vercel_project_name text not null default '',
  dns_provider text not null default '',
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

create table if not exists public.cloud_config_audit_runs_v2 (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.cloud_config_projects_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,

  run_status text not null default 'completed'
    check (run_status in ('queued', 'running', 'completed', 'failed', 'needs-review')),
  audit_scope text not null default 'supabase-vercel-dns'
    check (audit_scope in ('supabase', 'vercel', 'dns', 'supabase-vercel-dns', 'manual')),
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 100),
  risk_level text not null default 'Info'
    check (risk_level in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  passed_count integer not null default 0 check (passed_count >= 0),
  warning_count integer not null default 0 check (warning_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  manual_review_count integer not null default 0 check (manual_review_count >= 0),
  summary text not null default '',
  developer_action text not null default '',
  client_safe_summary text not null default '',
  audit_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.cloud_config_check_items_v2 (
  id uuid primary key default gen_random_uuid(),
  audit_run_id uuid not null references public.cloud_config_audit_runs_v2(id) on delete cascade,
  project_id uuid not null references public.cloud_config_projects_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  category text not null
    check (category in ('supabase-auth', 'supabase-rls', 'supabase-storage', 'vercel-env', 'vercel-deploy', 'dns-email', 'dns-domain', 'support-process')),
  check_key text not null,
  check_title text not null,
  check_status text not null default 'manual-review'
    check (check_status in ('pass', 'warning', 'fail', 'manual-review', 'not-applicable')),
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  evidence_summary text not null default '',
  remediation_action text not null default '',
  client_safe_note text not null default '',
  confidence_level text not null default 'Medium'
    check (confidence_level in ('High', 'Medium', 'Low', 'Needs manual review')),
  item_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.cloud_config_dns_records_v2 (
  id uuid primary key default gen_random_uuid(),
  audit_run_id uuid references public.cloud_config_audit_runs_v2(id) on delete cascade,
  project_id uuid not null references public.cloud_config_projects_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  record_type text not null default 'TXT'
    check (record_type in ('A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'CAA', 'OTHER')),
  record_name text not null default '',
  record_value_safe text not null default '',
  record_status text not null default 'manual-review'
    check (record_status in ('present', 'missing', 'weak', 'manual-review', 'not-applicable')),
  security_purpose text not null default '',
  finding_summary text not null default '',
  remediation_action text not null default '',
  record_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.cloud_config_remediation_tasks_v2 (
  id uuid primary key default gen_random_uuid(),
  audit_run_id uuid not null references public.cloud_config_audit_runs_v2(id) on delete cascade,
  project_id uuid not null references public.cloud_config_projects_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  task_title text not null,
  task_status text not null default 'open'
    check (task_status in ('open', 'in-progress', 'done', 'accepted-risk', 'false-positive')),
  priority text not null default 'Medium'
    check (priority in ('Critical', 'High', 'Medium', 'Low')),
  owner_role text not null default 'developer'
    check (owner_role in ('founder', 'developer', 'admin', 'dns-admin', 'legal-support')),
  task_summary text not null default '',
  safe_steps text not null default '',
  verification_hint text not null default '',
  due_note text not null default '',
  task_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cloud_config_admin_events_v2 (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.cloud_config_projects_v2(id) on delete cascade,
  audit_run_id uuid references public.cloud_config_audit_runs_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,

  event_type text not null default 'cloud-config-event'
    check (event_type in ('project-created', 'audit-created', 'task-created', 'dns-record-reviewed', 'cloud-config-event')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists cloud_config_projects_v2_user_id_idx on public.cloud_config_projects_v2(user_id);
create index if not exists cloud_config_audit_runs_v2_project_idx on public.cloud_config_audit_runs_v2(project_id, created_at desc);
create index if not exists cloud_config_check_items_v2_run_idx on public.cloud_config_check_items_v2(audit_run_id);
create index if not exists cloud_config_dns_records_v2_project_idx on public.cloud_config_dns_records_v2(project_id, created_at desc);
create index if not exists cloud_config_remediation_tasks_v2_project_idx on public.cloud_config_remediation_tasks_v2(project_id, created_at desc);
create index if not exists cloud_config_admin_events_v2_created_at_idx on public.cloud_config_admin_events_v2(created_at desc);

alter table public.cloud_config_projects_v2 enable row level security;
alter table public.cloud_config_audit_runs_v2 enable row level security;
alter table public.cloud_config_check_items_v2 enable row level security;
alter table public.cloud_config_dns_records_v2 enable row level security;
alter table public.cloud_config_remediation_tasks_v2 enable row level security;
alter table public.cloud_config_admin_events_v2 enable row level security;

drop policy if exists "Users can read own cloud config projects v2" on public.cloud_config_projects_v2;
create policy "Users can read own cloud config projects v2" on public.cloud_config_projects_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own cloud config projects v2" on public.cloud_config_projects_v2;
create policy "Users can insert own cloud config projects v2" on public.cloud_config_projects_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own cloud config projects v2" on public.cloud_config_projects_v2;
create policy "Users can update own cloud config projects v2" on public.cloud_config_projects_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own cloud config audit runs v2" on public.cloud_config_audit_runs_v2;
create policy "Users can read own cloud config audit runs v2" on public.cloud_config_audit_runs_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own cloud config audit runs v2" on public.cloud_config_audit_runs_v2;
create policy "Users can insert own cloud config audit runs v2" on public.cloud_config_audit_runs_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own cloud config check items v2" on public.cloud_config_check_items_v2;
create policy "Users can read own cloud config check items v2" on public.cloud_config_check_items_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own cloud config check items v2" on public.cloud_config_check_items_v2;
create policy "Users can insert own cloud config check items v2" on public.cloud_config_check_items_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own cloud config dns records v2" on public.cloud_config_dns_records_v2;
create policy "Users can read own cloud config dns records v2" on public.cloud_config_dns_records_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own cloud config dns records v2" on public.cloud_config_dns_records_v2;
create policy "Users can insert own cloud config dns records v2" on public.cloud_config_dns_records_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own cloud config tasks v2" on public.cloud_config_remediation_tasks_v2;
create policy "Users can read own cloud config tasks v2" on public.cloud_config_remediation_tasks_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own cloud config tasks v2" on public.cloud_config_remediation_tasks_v2;
create policy "Users can insert own cloud config tasks v2" on public.cloud_config_remediation_tasks_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own cloud config tasks v2" on public.cloud_config_remediation_tasks_v2;
create policy "Users can update own cloud config tasks v2" on public.cloud_config_remediation_tasks_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own cloud config events v2" on public.cloud_config_admin_events_v2;
create policy "Users can read own cloud config events v2" on public.cloud_config_admin_events_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own cloud config events v2" on public.cloud_config_admin_events_v2;
create policy "Users can insert own cloud config events v2" on public.cloud_config_admin_events_v2
for insert to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_cloud_config_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_cloud_config_projects_v2_updated_at on public.cloud_config_projects_v2;
create trigger touch_cloud_config_projects_v2_updated_at
before update on public.cloud_config_projects_v2
for each row execute function public.touch_cloud_config_v2_updated_at();

drop trigger if exists touch_cloud_config_remediation_tasks_v2_updated_at on public.cloud_config_remediation_tasks_v2;
create trigger touch_cloud_config_remediation_tasks_v2_updated_at
before update on public.cloud_config_remediation_tasks_v2
for each row execute function public.touch_cloud_config_v2_updated_at();
