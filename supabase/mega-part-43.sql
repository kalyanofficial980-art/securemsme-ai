-- Mega Part 43: Scan Consistency + Score Explanation Engine

create extension if not exists pgcrypto;

create table if not exists public.scan_consistency_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid not null references public.scans(id) on delete cascade,
  previous_scan_id uuid references public.scans(id) on delete set null,

  website_url text not null,
  engine_version text not null default '43.0',
  current_score integer not null default 0,
  previous_score integer,
  score_delta integer,
  current_risk text,
  previous_risk text,
  risk_transition text not null default 'no-previous-scan'
    check (risk_transition in ('improved', 'worsened', 'same', 'no-previous-scan', 'unknown')),
  confidence_level text not null default 'Medium'
    check (confidence_level in ('High', 'Medium', 'Low')),

  score_explanation jsonb not null default '{}'::jsonb,
  score_breakdown jsonb not null default '{}'::jsonb,
  delta_analysis jsonb not null default '{}'::jsonb,
  consistency_warnings jsonb not null default '[]'::jsonb,
  latest_scan_badge jsonb not null default '{}'::jsonb,
  customer_summary text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scan_consistency_reports_user_id_idx on public.scan_consistency_reports(user_id);
create index if not exists scan_consistency_reports_website_id_idx on public.scan_consistency_reports(website_id);
create index if not exists scan_consistency_reports_source_scan_id_idx on public.scan_consistency_reports(source_scan_id);
create index if not exists scan_consistency_reports_previous_scan_id_idx on public.scan_consistency_reports(previous_scan_id);
create index if not exists scan_consistency_reports_created_at_idx on public.scan_consistency_reports(created_at desc);

alter table public.scan_consistency_reports enable row level security;

drop policy if exists "Users and admins can read scan consistency reports" on public.scan_consistency_reports;
create policy "Users and admins can read scan consistency reports"
on public.scan_consistency_reports
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own scan consistency reports" on public.scan_consistency_reports;
create policy "Users can insert own scan consistency reports"
on public.scan_consistency_reports
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own scan consistency reports" on public.scan_consistency_reports;
create policy "Users can update own scan consistency reports"
on public.scan_consistency_reports
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_scan_consistency_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scan_consistency_reports_updated_at on public.scan_consistency_reports;
create trigger set_scan_consistency_reports_updated_at
before update on public.scan_consistency_reports
for each row
execute function public.set_scan_consistency_updated_at();
