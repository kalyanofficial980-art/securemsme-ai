-- Mega Part 72: Customer Onboarding Wizard + First Scan Funnel
-- Customer-friendly launch onboarding without payment/card data collection.
-- Authorized website confirmation only.

create extension if not exists pgcrypto;

create table if not exists public.customer_onboarding_profiles_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,

  business_name text not null default '',
  business_type text not null default 'msme'
    check (business_type in ('msme', 'startup', 'agency', 'freelancer', 'ngo', 'enterprise', 'other')),
  country text not null default 'India',
  industry text not null default '',
  team_size text not null default '1-5'
    check (team_size in ('1', '1-5', '6-20', '21-50', '51-200', '200+', 'unknown')),
  primary_goal text not null default 'first-security-check'
    check (primary_goal in ('first-security-check', 'client-report', 'developer-fixes', 'scheduled-monitoring', 'repo-security', 'cloud-config', 'agency-workflow')),
  security_maturity text not null default 'beginner'
    check (security_maturity in ('beginner', 'basic', 'growing', 'advanced')),
  onboarding_status text not null default 'started'
    check (onboarding_status in ('started', 'profile-completed', 'website-confirmed', 'plan-recommended', 'first-scan-ready', 'completed', 'paused')),
  onboarding_progress integer not null default 0 check (onboarding_progress >= 0 and onboarding_progress <= 100),
  latest_recommended_plan text not null default 'starter'
    check (latest_recommended_plan in ('starter', 'growth', 'agency', 'enterprise-review')),
  blocked_claims jsonb not null default '[]'::jsonb,
  profile_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id)
);

create table if not exists public.customer_onboarding_steps_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.customer_onboarding_profiles_v2(id) on delete cascade,

  step_key text not null,
  step_title text not null,
  step_status text not null default 'pending'
    check (step_status in ('pending', 'completed', 'skipped', 'blocked', 'needs-review')),
  step_order integer not null default 1,
  step_summary text not null default '',
  action_url text not null default '',
  required_before_launch boolean not null default true,
  step_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, step_key)
);

create table if not exists public.customer_first_scan_funnels_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.customer_onboarding_profiles_v2(id) on delete cascade,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,

  website_url text not null default '',
  ownership_status text not null default 'not-confirmed'
    check (ownership_status in ('not-confirmed', 'confirmed-owner', 'written-permission', 'needs-review')),
  authorization_confirmed boolean not null default false,
  authorization_note text not null default '',
  scan_goal text not null default 'first-safe-check'
    check (scan_goal in ('first-safe-check', 'client-report', 'developer-fixes', 'monitoring', 'sales-demo', 'agency-client')),
  risk_tolerance text not null default 'safe'
    check (risk_tolerance in ('safe', 'standard', 'manual-review')),
  funnel_status text not null default 'draft'
    check (funnel_status in ('draft', 'ready-to-scan', 'scan-linked', 'report-viewed', 'completed', 'blocked')),
  next_action text not null default '',
  client_safe_summary text not null default '',
  funnel_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_plan_recommendations_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.customer_onboarding_profiles_v2(id) on delete cascade,

  recommended_plan text not null default 'starter'
    check (recommended_plan in ('starter', 'growth', 'agency', 'enterprise-review')),
  recommendation_score integer not null default 0 check (recommendation_score >= 0 and recommendation_score <= 100),
  recommendation_reason text not null default '',
  included_features jsonb not null default '[]'::jsonb,
  next_best_action text not null default '',
  billing_cta text not null default '',
  recommendation_status text not null default 'active'
    check (recommendation_status in ('active', 'accepted', 'declined', 'expired')),
  recommendation_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.customer_onboarding_admin_events_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  profile_id uuid references public.customer_onboarding_profiles_v2(id) on delete cascade,
  funnel_id uuid references public.customer_first_scan_funnels_v2(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,

  event_type text not null default 'onboarding-event'
    check (event_type in ('profile-created', 'profile-updated', 'website-confirmed', 'plan-recommended', 'first-scan-ready', 'onboarding-completed', 'onboarding-event')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null default '',
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists customer_onboarding_profiles_v2_user_idx on public.customer_onboarding_profiles_v2(user_id);
create index if not exists customer_onboarding_steps_v2_user_idx on public.customer_onboarding_steps_v2(user_id, step_order);
create index if not exists customer_first_scan_funnels_v2_user_idx on public.customer_first_scan_funnels_v2(user_id, created_at desc);
create index if not exists customer_plan_recommendations_v2_user_idx on public.customer_plan_recommendations_v2(user_id, created_at desc);
create index if not exists customer_onboarding_admin_events_v2_created_idx on public.customer_onboarding_admin_events_v2(created_at desc);

alter table public.customer_onboarding_profiles_v2 enable row level security;
alter table public.customer_onboarding_steps_v2 enable row level security;
alter table public.customer_first_scan_funnels_v2 enable row level security;
alter table public.customer_plan_recommendations_v2 enable row level security;
alter table public.customer_onboarding_admin_events_v2 enable row level security;

drop policy if exists "Users can read own onboarding profiles v2" on public.customer_onboarding_profiles_v2;
create policy "Users can read own onboarding profiles v2" on public.customer_onboarding_profiles_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own onboarding profiles v2" on public.customer_onboarding_profiles_v2;
create policy "Users can insert own onboarding profiles v2" on public.customer_onboarding_profiles_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own onboarding profiles v2" on public.customer_onboarding_profiles_v2;
create policy "Users can update own onboarding profiles v2" on public.customer_onboarding_profiles_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own onboarding steps v2" on public.customer_onboarding_steps_v2;
create policy "Users can read own onboarding steps v2" on public.customer_onboarding_steps_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own onboarding steps v2" on public.customer_onboarding_steps_v2;
create policy "Users can insert own onboarding steps v2" on public.customer_onboarding_steps_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own onboarding steps v2" on public.customer_onboarding_steps_v2;
create policy "Users can update own onboarding steps v2" on public.customer_onboarding_steps_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own first scan funnels v2" on public.customer_first_scan_funnels_v2;
create policy "Users can read own first scan funnels v2" on public.customer_first_scan_funnels_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own first scan funnels v2" on public.customer_first_scan_funnels_v2;
create policy "Users can insert own first scan funnels v2" on public.customer_first_scan_funnels_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own first scan funnels v2" on public.customer_first_scan_funnels_v2;
create policy "Users can update own first scan funnels v2" on public.customer_first_scan_funnels_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own plan recommendations v2" on public.customer_plan_recommendations_v2;
create policy "Users can read own plan recommendations v2" on public.customer_plan_recommendations_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own plan recommendations v2" on public.customer_plan_recommendations_v2;
create policy "Users can insert own plan recommendations v2" on public.customer_plan_recommendations_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own onboarding events v2" on public.customer_onboarding_admin_events_v2;
create policy "Users can read own onboarding events v2" on public.customer_onboarding_admin_events_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own onboarding events v2" on public.customer_onboarding_admin_events_v2;
create policy "Users can insert own onboarding events v2" on public.customer_onboarding_admin_events_v2
for insert to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_customer_onboarding_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_customer_onboarding_profiles_v2_updated_at on public.customer_onboarding_profiles_v2;
create trigger touch_customer_onboarding_profiles_v2_updated_at
before update on public.customer_onboarding_profiles_v2
for each row execute function public.touch_customer_onboarding_v2_updated_at();

drop trigger if exists touch_customer_onboarding_steps_v2_updated_at on public.customer_onboarding_steps_v2;
create trigger touch_customer_onboarding_steps_v2_updated_at
before update on public.customer_onboarding_steps_v2
for each row execute function public.touch_customer_onboarding_v2_updated_at();

drop trigger if exists touch_customer_first_scan_funnels_v2_updated_at on public.customer_first_scan_funnels_v2;
create trigger touch_customer_first_scan_funnels_v2_updated_at
before update on public.customer_first_scan_funnels_v2
for each row execute function public.touch_customer_onboarding_v2_updated_at();
