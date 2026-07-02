-- Mega Part 62: Developer Portal + Fix Collaboration v2
-- Defensive remediation workflow for developers. No exploit payload sharing.

create extension if not exists pgcrypto;

create table if not exists public.developer_fix_portals_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  portal_title text not null default 'Developer Fix Portal',
  target_url text not null,
  portal_status text not null default 'active'
    check (portal_status in ('active', 'paused', 'completed', 'archived')),
  access_level text not null default 'developer'
    check (access_level in ('developer', 'client-developer', 'internal')),
  share_token text not null unique default encode(gen_random_bytes(24), 'hex'),

  total_task_count integer not null default 0,
  open_task_count integer not null default 0,
  in_progress_task_count integer not null default 0,
  fixed_task_count integer not null default 0,
  retest_requested_count integer not null default 0,
  verified_fixed_count integer not null default 0,
  blocked_task_count integer not null default 0,

  fix_progress_score integer not null default 0 check (fix_progress_score >= 0 and fix_progress_score <= 100),
  developer_readiness_score integer not null default 0 check (developer_readiness_score >= 0 and developer_readiness_score <= 100),
  retest_readiness_score integer not null default 0 check (retest_readiness_score >= 0 and retest_readiness_score <= 100),

  developer_summary text not null default '',
  client_safe_summary text not null default '',
  retest_summary text not null default '',
  blocked_claims jsonb not null default '[]'::jsonb,
  portal_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.developer_fix_tasks_v2 (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.developer_fix_portals_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,

  source_type text not null default 'manual'
    check (source_type in ('manual', 'workspace-bug', 'vulnerability-finding', 'api-endpoint', 'auth-observation', 'report-section')),
  source_id uuid,
  task_title text not null,
  task_status text not null default 'open'
    check (task_status in ('open', 'in-progress', 'fixed', 'retest-requested', 'verified-fixed', 'blocked', 'accepted-risk')),
  priority text not null default 'Medium'
    check (priority in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  confidence_level text not null default 'Medium'
    check (confidence_level in ('Confirmed', 'High', 'Medium', 'Low', 'Needs manual review')),

  affected_area text not null default '',
  developer_fix text not null default '',
  safe_retest_steps text not null default '',
  evidence_summary text not null default '',
  client_safe_note text not null default '',
  blocked_claim text not null default '',

  owner_name text not null default '',
  owner_email text not null default '',
  due_date date,
  estimated_effort text not null default 'unknown',
  task_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.developer_fix_comments_v2 (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.developer_fix_portals_v2(id) on delete cascade,
  task_id uuid references public.developer_fix_tasks_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,

  comment_type text not null default 'developer-note'
    check (comment_type in ('developer-note', 'fix-update', 'question', 'retest-note', 'internal-note')),
  visibility text not null default 'developer'
    check (visibility in ('developer', 'client', 'internal')),
  comment_body text not null,
  safe_comment boolean not null default true,
  blocked_reason text not null default '',

  created_at timestamptz not null default now()
);

create table if not exists public.developer_retest_requests_v2 (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.developer_fix_portals_v2(id) on delete cascade,
  task_id uuid references public.developer_fix_tasks_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,

  request_status text not null default 'requested'
    check (request_status in ('requested', 'approved', 'running', 'passed', 'failed', 'cancelled')),
  request_reason text not null default '',
  developer_note text not null default '',
  safe_retest_scope text not null default '',
  retest_result_summary text not null default '',
  retest_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.developer_portal_events_v2 (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid references public.developer_fix_portals_v2(id) on delete cascade,
  task_id uuid references public.developer_fix_tasks_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  event_type text not null default 'developer-portal-event'
    check (event_type in ('portal-created', 'task-created', 'task-updated', 'comment-added', 'retest-requested', 'portal-recalculated', 'developer-portal-event')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists developer_fix_portals_v2_user_id_idx on public.developer_fix_portals_v2(user_id);
create index if not exists developer_fix_portals_v2_scan_id_idx on public.developer_fix_portals_v2(scan_id);
create index if not exists developer_fix_portals_v2_share_token_idx on public.developer_fix_portals_v2(share_token);
create index if not exists developer_fix_tasks_v2_portal_id_idx on public.developer_fix_tasks_v2(portal_id);
create index if not exists developer_fix_tasks_v2_status_idx on public.developer_fix_tasks_v2(task_status);
create index if not exists developer_fix_comments_v2_task_id_idx on public.developer_fix_comments_v2(task_id);
create index if not exists developer_retest_requests_v2_portal_id_idx on public.developer_retest_requests_v2(portal_id);
create index if not exists developer_portal_events_v2_portal_id_idx on public.developer_portal_events_v2(portal_id);
create index if not exists developer_portal_events_v2_created_at_idx on public.developer_portal_events_v2(created_at desc);

alter table public.developer_fix_portals_v2 enable row level security;
alter table public.developer_fix_tasks_v2 enable row level security;
alter table public.developer_fix_comments_v2 enable row level security;
alter table public.developer_retest_requests_v2 enable row level security;
alter table public.developer_portal_events_v2 enable row level security;

drop policy if exists "Users can read own developer portals v2" on public.developer_fix_portals_v2;
create policy "Users can read own developer portals v2"
on public.developer_fix_portals_v2 for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own developer portals v2" on public.developer_fix_portals_v2;
create policy "Users can insert own developer portals v2"
on public.developer_fix_portals_v2 for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own developer portals v2" on public.developer_fix_portals_v2;
create policy "Users can update own developer portals v2"
on public.developer_fix_portals_v2 for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own developer tasks v2" on public.developer_fix_tasks_v2;
create policy "Users can read own developer tasks v2"
on public.developer_fix_tasks_v2 for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own developer tasks v2" on public.developer_fix_tasks_v2;
create policy "Users can insert own developer tasks v2"
on public.developer_fix_tasks_v2 for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own developer tasks v2" on public.developer_fix_tasks_v2;
create policy "Users can update own developer tasks v2"
on public.developer_fix_tasks_v2 for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own developer comments v2" on public.developer_fix_comments_v2;
create policy "Users can read own developer comments v2"
on public.developer_fix_comments_v2 for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own developer comments v2" on public.developer_fix_comments_v2;
create policy "Users can insert own developer comments v2"
on public.developer_fix_comments_v2 for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own developer retests v2" on public.developer_retest_requests_v2;
create policy "Users can read own developer retests v2"
on public.developer_retest_requests_v2 for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own developer retests v2" on public.developer_retest_requests_v2;
create policy "Users can insert own developer retests v2"
on public.developer_retest_requests_v2 for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own developer retests v2" on public.developer_retest_requests_v2;
create policy "Users can update own developer retests v2"
on public.developer_retest_requests_v2 for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own developer events v2" on public.developer_portal_events_v2;
create policy "Users can read own developer events v2"
on public.developer_portal_events_v2 for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own developer events v2" on public.developer_portal_events_v2;
create policy "Users can insert own developer events v2"
on public.developer_portal_events_v2 for insert to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_developer_portal_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_developer_fix_portals_v2_updated_at on public.developer_fix_portals_v2;
create trigger touch_developer_fix_portals_v2_updated_at
before update on public.developer_fix_portals_v2
for each row execute function public.touch_developer_portal_v2_updated_at();

drop trigger if exists touch_developer_fix_tasks_v2_updated_at on public.developer_fix_tasks_v2;
create trigger touch_developer_fix_tasks_v2_updated_at
before update on public.developer_fix_tasks_v2
for each row execute function public.touch_developer_portal_v2_updated_at();

drop trigger if exists touch_developer_retest_requests_v2_updated_at on public.developer_retest_requests_v2;
create trigger touch_developer_retest_requests_v2_updated_at
before update on public.developer_retest_requests_v2
for each row execute function public.touch_developer_portal_v2_updated_at();
