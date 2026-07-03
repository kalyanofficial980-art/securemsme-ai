-- Mega Part 59: Authenticated Safe Review v2
-- Safe authorized login-area review workflow. No password storage, no exploit actions.

create extension if not exists pgcrypto;

create table if not exists public.authenticated_review_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  context_name text not null default 'Authenticated Safe Review Context',
  target_url text not null,
  auth_base_url text,
  login_url text,
  test_account_label text not null default '',
  role_names text[] not null default array[]::text[],

  authorization_status text not null default 'pending'
    check (authorization_status in ('pending', 'approved', 'blocked', 'expired')),
  credential_storage_status text not null default 'not-stored'
    check (credential_storage_status in ('not-stored', 'external-secret-reference', 'revoked')),
  secret_reference_note text not null default '',
  scope_summary text not null default '',
  safe_boundaries text not null default '',
  blocked_actions jsonb not null default '[]'::jsonb,

  allowed_paths text[] not null default array[]::text[],
  excluded_paths text[] not null default array[]::text[],
  review_depth text not null default 'safe-standard'
    check (review_depth in ('safe-light', 'safe-standard', 'safe-deep')),

  expires_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.authenticated_safe_review_runs (
  id uuid primary key default gen_random_uuid(),
  context_id uuid not null references public.authenticated_review_contexts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,
  crawler_run_id uuid references public.advanced_crawler_runs(id) on delete set null,
  proof_chain_id uuid references public.security_proof_chains(id) on delete set null,

  target_url text not null,
  run_status text not null default 'completed'
    check (run_status in ('completed', 'completed-with-warnings', 'blocked', 'failed')),
  review_mode text not null default 'manual-safe'
    check (review_mode in ('manual-safe', 'metadata-only', 'role-comparison-safe')),
  authorization_gate text not null default 'approved'
    check (authorization_gate in ('approved', 'blocked')),

  total_pages_reviewed integer not null default 0,
  account_surface_count integer not null default 0,
  role_comparison_count integer not null default 0,
  cookie_review_count integer not null default 0,
  sensitive_page_signal_count integer not null default 0,
  developer_action_count integer not null default 0,
  needs_expert_review_count integer not null default 0,

  coverage_score integer not null default 0 check (coverage_score >= 0 and coverage_score <= 100),
  auth_risk_score integer not null default 0 check (auth_risk_score >= 0 and auth_risk_score <= 100),
  safe_summary text not null default '',
  developer_summary text not null default '',
  client_safe_summary text not null default '',
  blocked_claims jsonb not null default '[]'::jsonb,
  review_report jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.authenticated_page_observations (
  id uuid primary key default gen_random_uuid(),
  review_run_id uuid not null references public.authenticated_safe_review_runs(id) on delete cascade,
  context_id uuid not null references public.authenticated_review_contexts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,

  page_url text not null,
  page_type text not null default 'account-page'
    check (page_type in (
      'login',
      'account-page',
      'profile',
      'dashboard',
      'admin-candidate',
      'checkout-account',
      'settings',
      'password-reset',
      'logout',
      'unknown'
    )),
  access_state text not null default 'manual-observed'
    check (access_state in ('public', 'requires-login', 'manual-observed', 'not-accessed', 'blocked')),
  role_name text,
  contains_sensitive_data_signal boolean not null default false,
  contains_account_action_signal boolean not null default false,
  contains_payment_signal boolean not null default false,
  contains_file_upload_signal boolean not null default false,

  cookie_security_note text not null default '',
  session_security_note text not null default '',
  access_control_note text not null default '',
  evidence_summary text not null default '',
  developer_note text not null default '',
  client_safe_note text not null default '',
  blocked_claim text not null default '',

  observation_quality text not null default 'partial'
    check (observation_quality in ('strong', 'good', 'partial', 'weak', 'missing')),
  validation_status text not null default 'needs-review'
    check (validation_status in ('validated', 'needs-review', 'rejected', 'accepted-risk')),
  observation_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.authenticated_role_comparisons (
  id uuid primary key default gen_random_uuid(),
  review_run_id uuid not null references public.authenticated_safe_review_runs(id) on delete cascade,
  context_id uuid not null references public.authenticated_review_contexts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,

  comparison_name text not null,
  page_url text not null,
  role_a text not null default 'role-a',
  role_b text not null default 'role-b',
  expected_difference text not null default '',
  observed_difference text not null default '',
  access_control_signal text not null default 'needs-review'
    check (access_control_signal in ('expected-difference', 'unexpected-same-access', 'unexpected-extra-access', 'needs-review', 'not-tested')),
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),

  evidence_summary text not null default '',
  developer_note text not null default '',
  client_safe_note text not null default '',
  blocked_claim text not null default '',

  validation_status text not null default 'needs-review'
    check (validation_status in ('validated', 'needs-review', 'rejected', 'accepted-risk')),
  comparison_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.authenticated_review_checklist_items (
  id uuid primary key default gen_random_uuid(),
  review_run_id uuid not null references public.authenticated_safe_review_runs(id) on delete cascade,
  context_id uuid not null references public.authenticated_review_contexts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,

  checklist_key text not null,
  title text not null,
  category text not null default 'Authenticated Review',
  status text not null default 'not-checked'
    check (status in ('pass', 'needs-fix', 'not-checked', 'not-applicable', 'accepted-risk')),
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  evidence_summary text not null default '',
  developer_note text not null default '',
  client_safe_note text not null default '',
  blocked_claim text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(review_run_id, checklist_key)
);

create table if not exists public.authenticated_review_events (
  id uuid primary key default gen_random_uuid(),
  context_id uuid references public.authenticated_review_contexts(id) on delete cascade,
  review_run_id uuid references public.authenticated_safe_review_runs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  event_type text not null default 'auth-review-event'
    check (event_type in (
      'context-created',
      'context-approved',
      'review-started',
      'review-completed',
      'manual-observation-added',
      'role-comparison-added',
      'checklist-updated',
      'auth-review-event'
    )),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists authenticated_review_contexts_user_id_idx on public.authenticated_review_contexts(user_id);
create index if not exists authenticated_review_contexts_scan_id_idx on public.authenticated_review_contexts(scan_id);
create index if not exists authenticated_review_contexts_status_idx on public.authenticated_review_contexts(authorization_status);

create index if not exists authenticated_safe_review_runs_context_id_idx on public.authenticated_safe_review_runs(context_id);
create index if not exists authenticated_safe_review_runs_scan_id_idx on public.authenticated_safe_review_runs(scan_id);
create index if not exists authenticated_safe_review_runs_created_at_idx on public.authenticated_safe_review_runs(created_at desc);

create index if not exists authenticated_page_observations_run_id_idx on public.authenticated_page_observations(review_run_id);
create index if not exists authenticated_page_observations_scan_id_idx on public.authenticated_page_observations(scan_id);
create index if not exists authenticated_page_observations_page_type_idx on public.authenticated_page_observations(page_type);

create index if not exists authenticated_role_comparisons_run_id_idx on public.authenticated_role_comparisons(review_run_id);
create index if not exists authenticated_checklist_run_id_idx on public.authenticated_review_checklist_items(review_run_id);
create index if not exists authenticated_review_events_run_id_idx on public.authenticated_review_events(review_run_id);
create index if not exists authenticated_review_events_created_at_idx on public.authenticated_review_events(created_at desc);

alter table public.authenticated_review_contexts enable row level security;
alter table public.authenticated_safe_review_runs enable row level security;
alter table public.authenticated_page_observations enable row level security;
alter table public.authenticated_role_comparisons enable row level security;
alter table public.authenticated_review_checklist_items enable row level security;
alter table public.authenticated_review_events enable row level security;

drop policy if exists "Users can read own authenticated review contexts" on public.authenticated_review_contexts;
create policy "Users can read own authenticated review contexts"
on public.authenticated_review_contexts
for select
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own authenticated review contexts" on public.authenticated_review_contexts;
create policy "Users can insert own authenticated review contexts"
on public.authenticated_review_contexts
for insert
to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own authenticated review contexts" on public.authenticated_review_contexts;
create policy "Users can update own authenticated review contexts"
on public.authenticated_review_contexts
for update
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own authenticated safe review runs" on public.authenticated_safe_review_runs;
create policy "Users can read own authenticated safe review runs"
on public.authenticated_safe_review_runs
for select
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own authenticated safe review runs" on public.authenticated_safe_review_runs;
create policy "Users can insert own authenticated safe review runs"
on public.authenticated_safe_review_runs
for insert
to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own authenticated page observations" on public.authenticated_page_observations;
create policy "Users can read own authenticated page observations"
on public.authenticated_page_observations
for select
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own authenticated page observations" on public.authenticated_page_observations;
create policy "Users can insert own authenticated page observations"
on public.authenticated_page_observations
for insert
to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own authenticated page observations" on public.authenticated_page_observations;
create policy "Users can update own authenticated page observations"
on public.authenticated_page_observations
for update
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own authenticated role comparisons" on public.authenticated_role_comparisons;
create policy "Users can read own authenticated role comparisons"
on public.authenticated_role_comparisons
for select
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own authenticated role comparisons" on public.authenticated_role_comparisons;
create policy "Users can insert own authenticated role comparisons"
on public.authenticated_role_comparisons
for insert
to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own authenticated checklist" on public.authenticated_review_checklist_items;
create policy "Users can read own authenticated checklist"
on public.authenticated_review_checklist_items
for select
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own authenticated checklist" on public.authenticated_review_checklist_items;
create policy "Users can insert own authenticated checklist"
on public.authenticated_review_checklist_items
for insert
to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own authenticated checklist" on public.authenticated_review_checklist_items;
create policy "Users can update own authenticated checklist"
on public.authenticated_review_checklist_items
for update
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own authenticated review events" on public.authenticated_review_events;
create policy "Users can read own authenticated review events"
on public.authenticated_review_events
for select
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own authenticated review events" on public.authenticated_review_events;
create policy "Users can insert own authenticated review events"
on public.authenticated_review_events
for insert
to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_authenticated_review_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_authenticated_review_contexts_updated_at on public.authenticated_review_contexts;
create trigger touch_authenticated_review_contexts_updated_at
before update on public.authenticated_review_contexts
for each row
execute function public.touch_authenticated_review_updated_at();

drop trigger if exists touch_authenticated_page_observations_updated_at on public.authenticated_page_observations;
create trigger touch_authenticated_page_observations_updated_at
before update on public.authenticated_page_observations
for each row
execute function public.touch_authenticated_review_updated_at();

drop trigger if exists touch_authenticated_checklist_updated_at on public.authenticated_review_checklist_items;
create trigger touch_authenticated_checklist_updated_at
before update on public.authenticated_review_checklist_items
for each row
execute function public.touch_authenticated_review_updated_at();
