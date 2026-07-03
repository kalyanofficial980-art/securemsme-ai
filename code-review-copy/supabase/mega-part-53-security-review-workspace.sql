-- Mega Part 53: Security Review Workspace + Bug Lifecycle Dashboard
-- Defensive workflow tables for authorized cybersecurity reviews.

create extension if not exists pgcrypto;

create table if not exists public.security_review_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,

  title text not null,
  client_name text,
  client_email text,
  target_url text not null,
  business_type text not null default 'general-business',
  review_type text not null default 'website-security-review'
    check (review_type in (
      'website-security-review',
      'advanced-security-review',
      'customer-data-safety-review',
      'ecommerce-security-review',
      'school-clinic-data-review',
      'managed-monitoring-review'
    )),
  status text not null default 'active'
    check (status in ('draft', 'active', 'waiting-for-client', 'waiting-for-developer', 'retest-needed', 'completed', 'paused', 'cancelled')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  review_stage text not null default 'intake'
    check (review_stage in ('intake', 'scope-confirmed', 'scanning', 'triage', 'developer-fix', 'retest', 'client-approval', 'completed')),

  overall_risk text not null default 'Unknown',
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),

  total_items integer not null default 0,
  open_items integer not null default 0,
  in_progress_items integer not null default 0,
  fixed_by_developer_items integer not null default 0,
  needs_retest_items integer not null default 0,
  verified_fixed_items integer not null default 0,
  accepted_risk_items integer not null default 0,
  false_positive_items integer not null default 0,

  executive_summary text not null default '',
  scope_summary text not null default '',
  developer_summary text not null default '',
  client_summary text not null default '',
  internal_notes text not null default '',

  started_at timestamptz not null default now(),
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists security_review_workspaces_scan_unique
on public.security_review_workspaces(user_id, scan_id)
where scan_id is not null;

create table if not exists public.security_review_bug_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.security_review_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,
  source_finding_id uuid,

  item_type text not null default 'bug'
    check (item_type in ('bug', 'risk', 'misconfiguration', 'customer-data-risk', 'trust-gap', 'manual-task')),
  title text not null,
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  lifecycle_status text not null default 'open'
    check (lifecycle_status in ('open', 'in-progress', 'fixed-by-developer', 'needs-retest', 'verified-fixed', 'accepted-risk', 'false-positive')),
  owner_type text not null default 'platform'
    check (owner_type in ('platform', 'client', 'developer', 'expert-reviewer')),
  assigned_to text,

  affected_url text not null default '',
  evidence_summary text not null default '',
  business_impact text not null default '',
  customer_data_risk text not null default '',
  developer_fix text not null default '',
  retest_steps text not null default '',
  reviewer_note text not null default '',
  client_safe_note text not null default '',

  due_date timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.security_review_activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.security_review_workspaces(id) on delete cascade,
  bug_item_id uuid references public.security_review_bug_items(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,

  event_type text not null default 'workspace-event'
    check (event_type in (
      'workspace-created',
      'workspace-updated',
      'scanner-findings-synced',
      'manual-item-added',
      'item-status-updated',
      'review-stage-updated',
      'client-summary-updated',
      'developer-summary-updated',
      'workspace-event'
    )),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists security_review_workspaces_user_id_idx on public.security_review_workspaces(user_id);
create index if not exists security_review_workspaces_org_id_idx on public.security_review_workspaces(organization_id);
create index if not exists security_review_workspaces_scan_id_idx on public.security_review_workspaces(scan_id);
create index if not exists security_review_workspaces_status_idx on public.security_review_workspaces(status);
create index if not exists security_review_workspaces_updated_at_idx on public.security_review_workspaces(updated_at desc);

create index if not exists security_review_bug_items_workspace_id_idx on public.security_review_bug_items(workspace_id);
create index if not exists security_review_bug_items_user_id_idx on public.security_review_bug_items(user_id);
create index if not exists security_review_bug_items_status_idx on public.security_review_bug_items(lifecycle_status);
create index if not exists security_review_bug_items_severity_idx on public.security_review_bug_items(severity);
create index if not exists security_review_bug_items_updated_at_idx on public.security_review_bug_items(updated_at desc);

create index if not exists security_review_activity_events_workspace_id_idx on public.security_review_activity_events(workspace_id);
create index if not exists security_review_activity_events_created_at_idx on public.security_review_activity_events(created_at desc);

alter table public.security_review_workspaces enable row level security;
alter table public.security_review_bug_items enable row level security;
alter table public.security_review_activity_events enable row level security;

drop policy if exists "Users can read own security review workspaces" on public.security_review_workspaces;
create policy "Users can read own security review workspaces"
on public.security_review_workspaces
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own security review workspaces" on public.security_review_workspaces;
create policy "Users can insert own security review workspaces"
on public.security_review_workspaces
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own security review workspaces" on public.security_review_workspaces;
create policy "Users can update own security review workspaces"
on public.security_review_workspaces
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

drop policy if exists "Users can read own security review bug items" on public.security_review_bug_items;
create policy "Users can read own security review bug items"
on public.security_review_bug_items
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own security review bug items" on public.security_review_bug_items;
create policy "Users can insert own security review bug items"
on public.security_review_bug_items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own security review bug items" on public.security_review_bug_items;
create policy "Users can update own security review bug items"
on public.security_review_bug_items
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

drop policy if exists "Users can read own security review activity events" on public.security_review_activity_events;
create policy "Users can read own security review activity events"
on public.security_review_activity_events
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own security review activity events" on public.security_review_activity_events;
create policy "Users can insert own security review activity events"
on public.security_review_activity_events
for insert
to authenticated
with check (
  user_id is null
  or auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

create or replace function public.touch_security_review_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_security_review_workspaces_updated_at on public.security_review_workspaces;
create trigger touch_security_review_workspaces_updated_at
before update on public.security_review_workspaces
for each row
execute function public.touch_security_review_updated_at();

drop trigger if exists touch_security_review_bug_items_updated_at on public.security_review_bug_items;
create trigger touch_security_review_bug_items_updated_at
before update on public.security_review_bug_items
for each row
execute function public.touch_security_review_updated_at();

create or replace function public.recalculate_security_review_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_open integer;
  v_in_progress integer;
  v_fixed integer;
  v_retest integer;
  v_verified integer;
  v_accepted integer;
  v_false_positive integer;
  v_progress integer;
  v_risk text;
begin
  select
    count(*),
    count(*) filter (where lifecycle_status = 'open'),
    count(*) filter (where lifecycle_status = 'in-progress'),
    count(*) filter (where lifecycle_status = 'fixed-by-developer'),
    count(*) filter (where lifecycle_status = 'needs-retest'),
    count(*) filter (where lifecycle_status = 'verified-fixed'),
    count(*) filter (where lifecycle_status = 'accepted-risk'),
    count(*) filter (where lifecycle_status = 'false-positive')
  into
    v_total, v_open, v_in_progress, v_fixed, v_retest, v_verified, v_accepted, v_false_positive
  from public.security_review_bug_items
  where workspace_id = p_workspace_id;

  if coalesce(v_total, 0) = 0 then
    v_progress := 0;
    v_risk := 'Unknown';
  else
    v_progress := round(((coalesce(v_verified, 0) + coalesce(v_accepted, 0) + coalesce(v_false_positive, 0))::numeric / v_total::numeric) * 100);
    if exists (
      select 1 from public.security_review_bug_items
      where workspace_id = p_workspace_id
      and lifecycle_status not in ('verified-fixed', 'accepted-risk', 'false-positive')
      and severity in ('Critical', 'High')
    ) then
      v_risk := 'High attention needed';
    elsif exists (
      select 1 from public.security_review_bug_items
      where workspace_id = p_workspace_id
      and lifecycle_status not in ('verified-fixed', 'accepted-risk', 'false-positive')
      and severity = 'Medium'
    ) then
      v_risk := 'Needs attention';
    else
      v_risk := 'Improving';
    end if;
  end if;

  update public.security_review_workspaces
  set
    total_items = coalesce(v_total, 0),
    open_items = coalesce(v_open, 0),
    in_progress_items = coalesce(v_in_progress, 0),
    fixed_by_developer_items = coalesce(v_fixed, 0),
    needs_retest_items = coalesce(v_retest, 0),
    verified_fixed_items = coalesce(v_verified, 0),
    accepted_risk_items = coalesce(v_accepted, 0),
    false_positive_items = coalesce(v_false_positive, 0),
    progress_percent = v_progress,
    overall_risk = v_risk,
    updated_at = now()
  where id = p_workspace_id;
end;
$$;
