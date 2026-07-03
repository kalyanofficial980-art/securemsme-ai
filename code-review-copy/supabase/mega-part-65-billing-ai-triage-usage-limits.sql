-- Mega Part 65: Billing + AI Triage + Usage Limits
-- Billing foundation, plan/usage metering and rule-based AI triage.
-- No payment processor secrets. No exploit payload ranking. No fake vulnerability certainty.

create extension if not exists pgcrypto;

create table if not exists public.billing_plan_catalog_v2 (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  plan_name text not null,
  plan_status text not null default 'active'
    check (plan_status in ('active', 'paused', 'archived')),
  monthly_price_inr integer not null default 0 check (monthly_price_inr >= 0),
  monthly_price_usd integer not null default 0 check (monthly_price_usd >= 0),

  scan_limit integer not null default 0,
  website_limit integer not null default 0,
  report_limit integer not null default 0,
  client_portal_limit integer not null default 0,
  monitoring_target_limit integer not null default 0,
  ai_triage_limit integer not null default 0,
  team_member_limit integer not null default 1,

  feature_flags jsonb not null default '{}'::jsonb,
  plan_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.billing_plan_catalog_v2 (
  plan_key,
  plan_name,
  monthly_price_inr,
  monthly_price_usd,
  scan_limit,
  website_limit,
  report_limit,
  client_portal_limit,
  monitoring_target_limit,
  ai_triage_limit,
  team_member_limit,
  feature_flags,
  plan_description
)
values
  (
    'free',
    'Free',
    0,
    0,
    3,
    1,
    3,
    1,
    1,
    5,
    1,
    '{"basic_reports": true, "monitoring": false, "agency_soc": false, "ai_triage": true}'::jsonb,
    'Starter plan for testing SecureMSME AI safely.'
  ),
  (
    'starter',
    'Starter',
    999,
    12,
    25,
    5,
    25,
    10,
    5,
    50,
    2,
    '{"basic_reports": true, "monitoring": true, "agency_soc": false, "ai_triage": true}'::jsonb,
    'Starter paid plan for small businesses and developers.'
  ),
  (
    'agency',
    'Agency',
    4999,
    60,
    250,
    50,
    250,
    100,
    50,
    500,
    10,
    '{"basic_reports": true, "monitoring": true, "agency_soc": true, "ai_triage": true}'::jsonb,
    'Agency plan for managing multiple client security workflows.'
  ),
  (
    'pro',
    'Pro',
    9999,
    120,
    1000,
    200,
    1000,
    500,
    200,
    2000,
    25,
    '{"basic_reports": true, "monitoring": true, "agency_soc": true, "ai_triage": true, "priority_queue": true}'::jsonb,
    'Pro plan for larger security operations.'
  )
on conflict (plan_key) do update
set
  plan_name = excluded.plan_name,
  monthly_price_inr = excluded.monthly_price_inr,
  monthly_price_usd = excluded.monthly_price_usd,
  scan_limit = excluded.scan_limit,
  website_limit = excluded.website_limit,
  report_limit = excluded.report_limit,
  client_portal_limit = excluded.client_portal_limit,
  monitoring_target_limit = excluded.monitoring_target_limit,
  ai_triage_limit = excluded.ai_triage_limit,
  team_member_limit = excluded.team_member_limit,
  feature_flags = excluded.feature_flags,
  plan_description = excluded.plan_description,
  updated_at = now();

create table if not exists public.user_billing_profiles_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  plan_key text not null default 'free' references public.billing_plan_catalog_v2(plan_key),
  billing_status text not null default 'active'
    check (billing_status in ('active', 'trialing', 'past-due', 'paused', 'cancelled')),
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'yearly', 'manual')),
  trial_ends_at timestamptz,
  current_period_start timestamptz not null default date_trunc('month', now()),
  current_period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),

  payment_provider text not null default 'manual'
    check (payment_provider in ('manual', 'razorpay-placeholder', 'stripe-placeholder')),
  provider_customer_ref text not null default '',
  provider_subscription_ref text not null default '',

  billing_summary text not null default '',
  limit_summary text not null default '',
  blocked_claims jsonb not null default '[]'::jsonb,
  billing_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_counters_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  period_start timestamptz not null,
  period_end timestamptz not null,

  scans_used integer not null default 0 check (scans_used >= 0),
  websites_used integer not null default 0 check (websites_used >= 0),
  reports_used integer not null default 0 check (reports_used >= 0),
  client_portals_used integer not null default 0 check (client_portals_used >= 0),
  monitoring_targets_used integer not null default 0 check (monitoring_targets_used >= 0),
  ai_triage_used integer not null default 0 check (ai_triage_used >= 0),

  usage_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, period_start, period_end)
);

create table if not exists public.usage_events_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,

  event_type text not null
    check (event_type in ('scan-created', 'website-added', 'report-generated', 'client-portal-created', 'monitoring-target-created', 'ai-triage-run', 'limit-warning', 'limit-block')),
  usage_key text not null,
  usage_amount integer not null default 1 check (usage_amount >= 0),
  plan_key text not null default 'free',
  limit_value integer not null default 0,
  used_after_event integer not null default 0,
  event_status text not null default 'allowed'
    check (event_status in ('allowed', 'warning', 'blocked', 'manual-review')),

  event_title text not null,
  event_details text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_triage_runs_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  target_url text not null,
  run_status text not null default 'completed'
    check (run_status in ('queued', 'running', 'completed', 'needs-review', 'failed')),
  triage_mode text not null default 'safe-rule-based'
    check (triage_mode in ('safe-rule-based', 'manual-assisted', 'agency-priority')),
  total_item_count integer not null default 0,
  urgent_count integer not null default 0,
  high_priority_count integer not null default 0,
  quick_win_count integer not null default 0,
  needs_review_count integer not null default 0,
  accepted_risk_count integer not null default 0,

  triage_score integer not null default 0 check (triage_score >= 0 and triage_score <= 100),
  business_impact_score integer not null default 0 check (business_impact_score >= 0 and business_impact_score <= 100),
  remediation_efficiency_score integer not null default 0 check (remediation_efficiency_score >= 0 and remediation_efficiency_score <= 100),
  confidence_score integer not null default 0 check (confidence_score >= 0 and confidence_score <= 100),

  executive_summary text not null default '',
  developer_summary text not null default '',
  client_safe_summary text not null default '',
  limitations_summary text not null default '',
  blocked_claims jsonb not null default '[]'::jsonb,
  source_counts jsonb not null default '{}'::jsonb,
  run_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.ai_triage_items_v2 (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_triage_runs_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,

  source_type text not null default 'manual'
    check (source_type in ('manual', 'developer-task', 'monitoring-alert', 'retest-item', 'workspace-bug', 'vulnerability-finding')),
  source_id uuid,
  item_title text not null,
  item_status text not null default 'open'
    check (item_status in ('open', 'in-progress', 'fixed', 'retest-requested', 'verified-fixed', 'accepted-risk', 'needs-review')),
  priority text not null default 'Medium'
    check (priority in ('Urgent', 'High', 'Medium', 'Low', 'Quick Win', 'Needs Review')),
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  confidence_level text not null default 'Medium'
    check (confidence_level in ('Confirmed', 'High', 'Medium', 'Low', 'Needs manual review')),

  triage_rank integer not null default 0,
  triage_score integer not null default 0 check (triage_score >= 0 and triage_score <= 100),
  business_impact_score integer not null default 0 check (business_impact_score >= 0 and business_impact_score <= 100),
  fix_effort_score integer not null default 50 check (fix_effort_score >= 0 and fix_effort_score <= 100),
  confidence_score integer not null default 50 check (confidence_score >= 0 and confidence_score <= 100),

  affected_area text not null default '',
  reason_summary text not null default '',
  developer_action text not null default '',
  client_safe_note text not null default '',
  blocked_claim text not null default '',
  item_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.billing_ai_triage_events_v2 (
  id uuid primary key default gen_random_uuid(),
  billing_profile_id uuid references public.user_billing_profiles_v2(id) on delete cascade,
  triage_run_id uuid references public.ai_triage_runs_v2(id) on delete cascade,
  usage_event_id uuid references public.usage_events_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  event_type text not null default 'billing-ai-triage-event'
    check (event_type in ('billing-profile-created', 'usage-recorded', 'limit-warning', 'limit-blocked', 'triage-run-created', 'billing-ai-triage-event')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists user_billing_profiles_v2_user_id_idx on public.user_billing_profiles_v2(user_id);
create index if not exists usage_counters_v2_user_period_idx on public.usage_counters_v2(user_id, period_start, period_end);
create index if not exists usage_events_v2_user_id_idx on public.usage_events_v2(user_id);
create index if not exists usage_events_v2_created_at_idx on public.usage_events_v2(created_at desc);
create index if not exists ai_triage_runs_v2_user_id_idx on public.ai_triage_runs_v2(user_id);
create index if not exists ai_triage_runs_v2_scan_id_idx on public.ai_triage_runs_v2(scan_id);
create index if not exists ai_triage_items_v2_run_id_idx on public.ai_triage_items_v2(run_id);
create index if not exists ai_triage_items_v2_rank_idx on public.ai_triage_items_v2(run_id, triage_rank);
create index if not exists billing_ai_triage_events_v2_created_at_idx on public.billing_ai_triage_events_v2(created_at desc);

alter table public.billing_plan_catalog_v2 enable row level security;
alter table public.user_billing_profiles_v2 enable row level security;
alter table public.usage_counters_v2 enable row level security;
alter table public.usage_events_v2 enable row level security;
alter table public.ai_triage_runs_v2 enable row level security;
alter table public.ai_triage_items_v2 enable row level security;
alter table public.billing_ai_triage_events_v2 enable row level security;

drop policy if exists "Authenticated users can read billing plan catalog v2" on public.billing_plan_catalog_v2;
create policy "Authenticated users can read billing plan catalog v2"
on public.billing_plan_catalog_v2 for select to authenticated using (true);

drop policy if exists "Users can read own billing profiles v2" on public.user_billing_profiles_v2;
create policy "Users can read own billing profiles v2" on public.user_billing_profiles_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own billing profiles v2" on public.user_billing_profiles_v2;
create policy "Users can insert own billing profiles v2" on public.user_billing_profiles_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own billing profiles v2" on public.user_billing_profiles_v2;
create policy "Users can update own billing profiles v2" on public.user_billing_profiles_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own usage counters v2" on public.usage_counters_v2;
create policy "Users can read own usage counters v2" on public.usage_counters_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own usage counters v2" on public.usage_counters_v2;
create policy "Users can insert own usage counters v2" on public.usage_counters_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own usage counters v2" on public.usage_counters_v2;
create policy "Users can update own usage counters v2" on public.usage_counters_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own usage events v2" on public.usage_events_v2;
create policy "Users can read own usage events v2" on public.usage_events_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own usage events v2" on public.usage_events_v2;
create policy "Users can insert own usage events v2" on public.usage_events_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own ai triage runs v2" on public.ai_triage_runs_v2;
create policy "Users can read own ai triage runs v2" on public.ai_triage_runs_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own ai triage runs v2" on public.ai_triage_runs_v2;
create policy "Users can insert own ai triage runs v2" on public.ai_triage_runs_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own ai triage items v2" on public.ai_triage_items_v2;
create policy "Users can read own ai triage items v2" on public.ai_triage_items_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own ai triage items v2" on public.ai_triage_items_v2;
create policy "Users can insert own ai triage items v2" on public.ai_triage_items_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own billing ai triage events v2" on public.billing_ai_triage_events_v2;
create policy "Users can read own billing ai triage events v2" on public.billing_ai_triage_events_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own billing ai triage events v2" on public.billing_ai_triage_events_v2;
create policy "Users can insert own billing ai triage events v2" on public.billing_ai_triage_events_v2
for insert to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_billing_ai_triage_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_billing_plan_catalog_v2_updated_at on public.billing_plan_catalog_v2;
create trigger touch_billing_plan_catalog_v2_updated_at
before update on public.billing_plan_catalog_v2
for each row execute function public.touch_billing_ai_triage_v2_updated_at();

drop trigger if exists touch_user_billing_profiles_v2_updated_at on public.user_billing_profiles_v2;
create trigger touch_user_billing_profiles_v2_updated_at
before update on public.user_billing_profiles_v2
for each row execute function public.touch_billing_ai_triage_v2_updated_at();

drop trigger if exists touch_usage_counters_v2_updated_at on public.usage_counters_v2;
create trigger touch_usage_counters_v2_updated_at
before update on public.usage_counters_v2
for each row execute function public.touch_billing_ai_triage_v2_updated_at();
