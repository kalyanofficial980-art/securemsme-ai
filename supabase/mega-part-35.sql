-- Mega Part 35: Authenticated Customer Scan Foundation

create extension if not exists pgcrypto;

create table if not exists public.authenticated_scan_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,

  target_url text not null,
  login_url text not null,
  auth_method text not null default 'test-account'
    check (auth_method in ('test-account', 'staging-test-account', 'magic-link-test-account', 'future-sso')),
  test_account_role text not null default 'low-privilege-test-user',
  credential_handling_mode text not null default 'do-not-store-password'
    check (credential_handling_mode in ('do-not-store-password', 'customer-enters-session-later', 'future-vault')),
  requested_intensity text not null default 'standard'
    check (requested_intensity in ('light', 'standard', 'deep')),

  status text not null default 'requested'
    check (status in ('requested', 'admin-review', 'approved', 'rejected', 'ready-for-session', 'completed', 'cancelled')),
  admin_review_status text not null default 'pending'
    check (admin_review_status in ('pending', 'approved', 'rejected', 'needs-info')),

  scope_summary jsonb not null default '{}'::jsonb,
  allowed_paths jsonb not null default '[]'::jsonb,
  blocked_paths jsonb not null default '[]'::jsonb,
  blocked_actions jsonb not null default '[]'::jsonb,
  safety_checklist jsonb not null default '[]'::jsonb,
  customer_attestations jsonb not null default '[]'::jsonb,
  admin_notes text,
  customer_notes text,
  rejection_reason text,

  permission_attested_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.authenticated_scan_session_plans (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.authenticated_scan_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,

  plan_status text not null default 'planned'
    check (plan_status in ('planned', 'ready', 'running', 'completed', 'blocked', 'expired')),
  session_handling text not null default 'customer-controlled-session'
    check (session_handling in ('customer-controlled-session', 'future-browser-session', 'future-token-vault')),
  crawl_policy jsonb not null default '{}'::jsonb,
  mutation_policy jsonb not null default '{}'::jsonb,
  privacy_policy jsonb not null default '{}'::jsonb,
  planned_routes jsonb not null default '[]'::jsonb,
  blocked_routes jsonb not null default '[]'::jsonb,
  evidence_policy jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists authenticated_scan_requests_user_id_idx
  on public.authenticated_scan_requests(user_id);

create index if not exists authenticated_scan_requests_website_id_idx
  on public.authenticated_scan_requests(website_id);

create index if not exists authenticated_scan_requests_source_scan_id_idx
  on public.authenticated_scan_requests(source_scan_id);

create index if not exists authenticated_scan_requests_status_idx
  on public.authenticated_scan_requests(status);

create index if not exists authenticated_scan_session_plans_request_id_idx
  on public.authenticated_scan_session_plans(request_id);

create index if not exists authenticated_scan_session_plans_user_id_idx
  on public.authenticated_scan_session_plans(user_id);

alter table public.authenticated_scan_requests enable row level security;
alter table public.authenticated_scan_session_plans enable row level security;

drop policy if exists "Users can read own authenticated scan requests" on public.authenticated_scan_requests;
create policy "Users can read own authenticated scan requests"
on public.authenticated_scan_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own authenticated scan requests" on public.authenticated_scan_requests;
create policy "Users can insert own authenticated scan requests"
on public.authenticated_scan_requests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own authenticated scan requests" on public.authenticated_scan_requests;
create policy "Users can update own authenticated scan requests"
on public.authenticated_scan_requests
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own authenticated session plans" on public.authenticated_scan_session_plans;
create policy "Users can read own authenticated session plans"
on public.authenticated_scan_session_plans
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own authenticated session plans" on public.authenticated_scan_session_plans;
create policy "Users can insert own authenticated session plans"
on public.authenticated_scan_session_plans
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own authenticated session plans" on public.authenticated_scan_session_plans;
create policy "Users can update own authenticated session plans"
on public.authenticated_scan_session_plans
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_authenticated_scan_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.admin_review_status = 'approved' and old.admin_review_status is distinct from 'approved' then
    new.approved_at = now();
  end if;

  if new.admin_review_status = 'rejected' and old.admin_review_status is distinct from 'rejected' then
    new.rejected_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_authenticated_scan_requests_updated_at on public.authenticated_scan_requests;
create trigger set_authenticated_scan_requests_updated_at
before update on public.authenticated_scan_requests
for each row
execute function public.set_authenticated_scan_updated_at();

drop trigger if exists set_authenticated_scan_session_plans_updated_at on public.authenticated_scan_session_plans;
create trigger set_authenticated_scan_session_plans_updated_at
before update on public.authenticated_scan_session_plans
for each row
execute function public.set_authenticated_scan_updated_at();
