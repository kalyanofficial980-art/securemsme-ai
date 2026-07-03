-- Mega Part 44: Report Truth Cleanup + Evidence-Specific Fix Engine

create extension if not exists pgcrypto;

create table if not exists public.report_truth_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid not null references public.scans(id) on delete cascade,

  website_url text not null,
  engine_version text not null default '44.0',
  review_status text not null default 'completed'
    check (review_status in ('completed', 'completed-with-warnings', 'failed')),

  truth_score integer not null default 0 check (truth_score >= 0 and truth_score <= 100),
  fake_risk_level text not null default 'medium'
    check (fake_risk_level in ('low', 'medium', 'high')),
  generic_text_count integer not null default 0,
  repeated_fix_count integer not null default 0,
  missing_evidence_count integer not null default 0,
  cleaned_fix_count integer not null default 0,
  manual_review_count integer not null default 0,

  review_summary jsonb not null default '{}'::jsonb,
  cleaned_report jsonb not null default '{}'::jsonb,
  truth_warnings jsonb not null default '[]'::jsonb,
  customer_safe_claims jsonb not null default '[]'::jsonb,
  blocked_claims jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_truth_fix_items (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.report_truth_reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid not null references public.scans(id) on delete cascade,

  issue_key text not null,
  category text not null,
  title text not null,
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  confidence text not null default 'Medium'
    check (confidence in ('High', 'Medium', 'Low')),
  evidence_status text not null default 'needs-review'
    check (evidence_status in ('confirmed', 'probable', 'needs-review', 'informational')),

  original_text text,
  evidence_summary text not null,
  why_it_matters text not null,
  exact_developer_fix text not null,
  validation_steps text not null,
  safe_customer_wording text not null,
  cannot_claim text not null,
  source_module text not null default 'base-scan',
  standards jsonb not null default '{}'::jsonb,
  raw_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists report_truth_reviews_user_id_idx on public.report_truth_reviews(user_id);
create index if not exists report_truth_reviews_website_id_idx on public.report_truth_reviews(website_id);
create index if not exists report_truth_reviews_source_scan_id_idx on public.report_truth_reviews(source_scan_id);
create index if not exists report_truth_reviews_created_at_idx on public.report_truth_reviews(created_at desc);

create index if not exists report_truth_fix_items_review_id_idx on public.report_truth_fix_items(review_id);
create index if not exists report_truth_fix_items_user_id_idx on public.report_truth_fix_items(user_id);
create index if not exists report_truth_fix_items_source_scan_id_idx on public.report_truth_fix_items(source_scan_id);
create index if not exists report_truth_fix_items_issue_key_idx on public.report_truth_fix_items(issue_key);
create index if not exists report_truth_fix_items_severity_idx on public.report_truth_fix_items(severity);

alter table public.report_truth_reviews enable row level security;
alter table public.report_truth_fix_items enable row level security;

drop policy if exists "Users and admins can read report truth reviews" on public.report_truth_reviews;
create policy "Users and admins can read report truth reviews"
on public.report_truth_reviews
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own report truth reviews" on public.report_truth_reviews;
create policy "Users can insert own report truth reviews"
on public.report_truth_reviews
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own report truth reviews" on public.report_truth_reviews;
create policy "Users can update own report truth reviews"
on public.report_truth_reviews
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read report truth fix items" on public.report_truth_fix_items;
create policy "Users and admins can read report truth fix items"
on public.report_truth_fix_items
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own report truth fix items" on public.report_truth_fix_items;
create policy "Users can insert own report truth fix items"
on public.report_truth_fix_items
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.set_report_truth_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_report_truth_reviews_updated_at on public.report_truth_reviews;
create trigger set_report_truth_reviews_updated_at
before update on public.report_truth_reviews
for each row
execute function public.set_report_truth_reviews_updated_at();
