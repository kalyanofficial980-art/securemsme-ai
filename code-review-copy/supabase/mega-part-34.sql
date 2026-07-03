-- Mega Part 34: Retest Proof Automation + Evidence Diff Engine

create extension if not exists pgcrypto;

create table if not exists public.retest_proof_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,

  before_scan_id uuid not null references public.scans(id) on delete cascade,
  after_scan_id uuid not null references public.scans(id) on delete cascade,
  before_run_ids jsonb not null default '[]'::jsonb,
  after_run_ids jsonb not null default '[]'::jsonb,

  proof_status text not null default 'generated'
    check (proof_status in ('generated', 'verified-improvement', 'no-change', 'regression-risk', 'needs-review')),
  score_before integer,
  score_after integer,
  score_change integer not null default 0,

  fixed_count integer not null default 0,
  improved_count integer not null default 0,
  still_open_count integer not null default 0,
  new_issue_count integer not null default 0,
  high_priority_count integer not null default 0,

  evidence_diff jsonb not null default '{}'::jsonb,
  proof_summary jsonb not null default '{}'::jsonb,
  developer_next_actions jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists retest_proof_reports_user_id_idx
  on public.retest_proof_reports(user_id);

create index if not exists retest_proof_reports_website_id_idx
  on public.retest_proof_reports(website_id);

create index if not exists retest_proof_reports_before_scan_id_idx
  on public.retest_proof_reports(before_scan_id);

create index if not exists retest_proof_reports_after_scan_id_idx
  on public.retest_proof_reports(after_scan_id);

alter table public.retest_proof_reports enable row level security;

drop policy if exists "Users can read own retest proof reports" on public.retest_proof_reports;
create policy "Users can read own retest proof reports"
on public.retest_proof_reports
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own retest proof reports" on public.retest_proof_reports;
create policy "Users can insert own retest proof reports"
on public.retest_proof_reports
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own retest proof reports" on public.retest_proof_reports;
create policy "Users can delete own retest proof reports"
on public.retest_proof_reports
for delete
to authenticated
using (auth.uid() = user_id);
