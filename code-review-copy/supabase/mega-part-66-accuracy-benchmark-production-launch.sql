-- Mega Part 66: Accuracy Benchmark + Production Launch Hardening
-- Final quality control, benchmark evidence and SaaS launch readiness.
-- No 100% secure claims, no legal compliance certificate claims.

create extension if not exists pgcrypto;

create table if not exists public.accuracy_benchmark_runs_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,

  benchmark_title text not null default 'Accuracy Benchmark',
  benchmark_status text not null default 'completed'
    check (benchmark_status in ('queued', 'running', 'completed', 'needs-review', 'failed')),
  benchmark_mode text not null default 'safe-quality-control'
    check (benchmark_mode in ('safe-quality-control', 'pre-launch', 'agency-quality')),

  total_case_count integer not null default 0,
  passed_case_count integer not null default 0,
  failed_case_count integer not null default 0,
  warning_case_count integer not null default 0,
  manual_review_count integer not null default 0,

  accuracy_score integer not null default 0 check (accuracy_score >= 0 and accuracy_score <= 100),
  evidence_score integer not null default 0 check (evidence_score >= 0 and evidence_score <= 100),
  false_positive_control_score integer not null default 0 check (false_positive_control_score >= 0 and false_positive_control_score <= 100),
  claim_safety_score integer not null default 0 check (claim_safety_score >= 0 and claim_safety_score <= 100),
  benchmark_confidence_score integer not null default 0 check (benchmark_confidence_score >= 0 and benchmark_confidence_score <= 100),

  executive_summary text not null default '',
  developer_summary text not null default '',
  client_safe_summary text not null default '',
  limitations_summary text not null default '',
  blocked_claims jsonb not null default '[]'::jsonb,
  source_counts jsonb not null default '{}'::jsonb,
  benchmark_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.accuracy_benchmark_cases_v2 (
  id uuid primary key default gen_random_uuid(),
  benchmark_run_id uuid not null references public.accuracy_benchmark_runs_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,

  case_key text not null,
  case_title text not null,
  case_category text not null default 'quality-control'
    check (case_category in ('quality-control', 'evidence', 'false-positive-control', 'claim-safety', 'client-report', 'developer-workflow', 'monitoring', 'billing')),
  case_status text not null default 'pass'
    check (case_status in ('pass', 'fail', 'warning', 'manual-review')),
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),

  expected_result text not null default '',
  actual_result text not null default '',
  evidence_summary text not null default '',
  remediation_action text not null default '',
  client_safe_note text not null default '',
  blocked_claim text not null default '',
  case_score integer not null default 0 check (case_score >= 0 and case_score <= 100),
  case_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique(benchmark_run_id, case_key)
);

create table if not exists public.production_launch_checks_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,

  check_key text not null,
  check_title text not null,
  check_group text not null default 'production'
    check (check_group in ('security', 'auth', 'database', 'legal', 'billing', 'monitoring', 'quality', 'deployment', 'support', 'production')),
  check_status text not null default 'pending'
    check (check_status in ('pending', 'pass', 'warning', 'fail', 'blocked', 'not-applicable')),
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),

  owner_note text not null default '',
  evidence_summary text not null default '',
  required_action text not null default '',
  client_safe_note text not null default '',
  blocker_reason text not null default '',
  display_order integer not null default 0,
  check_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, check_key)
);

create table if not exists public.production_launch_snapshots_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  benchmark_run_id uuid references public.accuracy_benchmark_runs_v2(id) on delete set null,

  snapshot_title text not null default 'Production Launch Readiness',
  snapshot_status text not null default 'needs-review'
    check (snapshot_status in ('ready', 'needs-review', 'blocked', 'archived')),
  release_channel text not null default 'production'
    check (release_channel in ('local', 'preview', 'production')),

  total_check_count integer not null default 0,
  passed_check_count integer not null default 0,
  warning_check_count integer not null default 0,
  failed_check_count integer not null default 0,
  blocked_check_count integer not null default 0,

  launch_readiness_score integer not null default 0 check (launch_readiness_score >= 0 and launch_readiness_score <= 100),
  security_hardening_score integer not null default 0 check (security_hardening_score >= 0 and security_hardening_score <= 100),
  operational_readiness_score integer not null default 0 check (operational_readiness_score >= 0 and operational_readiness_score <= 100),
  quality_confidence_score integer not null default 0 check (quality_confidence_score >= 0 and quality_confidence_score <= 100),
  customer_trust_score integer not null default 0 check (customer_trust_score >= 0 and customer_trust_score <= 100),

  executive_summary text not null default '',
  launch_blocker_summary text not null default '',
  hardening_summary text not null default '',
  final_recommendation text not null default '',
  blocked_claims jsonb not null default '[]'::jsonb,
  snapshot_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.production_release_notes_v2 (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.production_launch_snapshots_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  note_type text not null default 'launch-note'
    check (note_type in ('launch-note', 'known-limitation', 'release-blocker', 'post-launch-task', 'customer-safe-note')),
  note_title text not null,
  note_body text not null default '',
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  display_order integer not null default 0,
  note_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.launch_hardening_events_v2 (
  id uuid primary key default gen_random_uuid(),
  benchmark_run_id uuid references public.accuracy_benchmark_runs_v2(id) on delete cascade,
  snapshot_id uuid references public.production_launch_snapshots_v2(id) on delete cascade,
  check_id uuid references public.production_launch_checks_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,

  event_type text not null default 'launch-hardening-event'
    check (event_type in ('benchmark-created', 'launch-check-seeded', 'launch-check-updated', 'launch-snapshot-created', 'release-note-created', 'launch-hardening-event')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists accuracy_benchmark_runs_v2_user_id_idx on public.accuracy_benchmark_runs_v2(user_id);
create index if not exists accuracy_benchmark_runs_v2_created_at_idx on public.accuracy_benchmark_runs_v2(created_at desc);
create index if not exists accuracy_benchmark_cases_v2_run_id_idx on public.accuracy_benchmark_cases_v2(benchmark_run_id);
create index if not exists production_launch_checks_v2_user_id_idx on public.production_launch_checks_v2(user_id);
create index if not exists production_launch_checks_v2_status_idx on public.production_launch_checks_v2(check_status);
create index if not exists production_launch_snapshots_v2_user_id_idx on public.production_launch_snapshots_v2(user_id);
create index if not exists production_release_notes_v2_snapshot_id_idx on public.production_release_notes_v2(snapshot_id);
create index if not exists launch_hardening_events_v2_created_at_idx on public.launch_hardening_events_v2(created_at desc);

alter table public.accuracy_benchmark_runs_v2 enable row level security;
alter table public.accuracy_benchmark_cases_v2 enable row level security;
alter table public.production_launch_checks_v2 enable row level security;
alter table public.production_launch_snapshots_v2 enable row level security;
alter table public.production_release_notes_v2 enable row level security;
alter table public.launch_hardening_events_v2 enable row level security;

drop policy if exists "Users can read own accuracy benchmark runs v2" on public.accuracy_benchmark_runs_v2;
create policy "Users can read own accuracy benchmark runs v2" on public.accuracy_benchmark_runs_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own accuracy benchmark runs v2" on public.accuracy_benchmark_runs_v2;
create policy "Users can insert own accuracy benchmark runs v2" on public.accuracy_benchmark_runs_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own accuracy benchmark cases v2" on public.accuracy_benchmark_cases_v2;
create policy "Users can read own accuracy benchmark cases v2" on public.accuracy_benchmark_cases_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own accuracy benchmark cases v2" on public.accuracy_benchmark_cases_v2;
create policy "Users can insert own accuracy benchmark cases v2" on public.accuracy_benchmark_cases_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own production launch checks v2" on public.production_launch_checks_v2;
create policy "Users can read own production launch checks v2" on public.production_launch_checks_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own production launch checks v2" on public.production_launch_checks_v2;
create policy "Users can insert own production launch checks v2" on public.production_launch_checks_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own production launch checks v2" on public.production_launch_checks_v2;
create policy "Users can update own production launch checks v2" on public.production_launch_checks_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own production launch snapshots v2" on public.production_launch_snapshots_v2;
create policy "Users can read own production launch snapshots v2" on public.production_launch_snapshots_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own production launch snapshots v2" on public.production_launch_snapshots_v2;
create policy "Users can insert own production launch snapshots v2" on public.production_launch_snapshots_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own production release notes v2" on public.production_release_notes_v2;
create policy "Users can read own production release notes v2" on public.production_release_notes_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own production release notes v2" on public.production_release_notes_v2;
create policy "Users can insert own production release notes v2" on public.production_release_notes_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own launch hardening events v2" on public.launch_hardening_events_v2;
create policy "Users can read own launch hardening events v2" on public.launch_hardening_events_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own launch hardening events v2" on public.launch_hardening_events_v2;
create policy "Users can insert own launch hardening events v2" on public.launch_hardening_events_v2
for insert to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_production_launch_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_production_launch_checks_v2_updated_at on public.production_launch_checks_v2;
create trigger touch_production_launch_checks_v2_updated_at
before update on public.production_launch_checks_v2
for each row execute function public.touch_production_launch_v2_updated_at();
