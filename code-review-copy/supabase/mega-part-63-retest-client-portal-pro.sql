-- Mega Part 63: Retest + Client Portal Pro
-- Safe retest workflow and shareable client portal. No exploit payloads or destructive testing.
create extension if not exists pgcrypto;

create table if not exists public.retest_runs_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,
  developer_portal_id uuid references public.developer_fix_portals_v2(id) on delete set null,
  target_url text not null,
  run_status text not null default 'ready' check (run_status in ('ready','running','completed','needs-review','archived')),
  total_items integer not null default 0,
  passed_items integer not null default 0,
  failed_items integer not null default 0,
  needs_review_items integer not null default 0,
  blocked_items integer not null default 0,
  pending_items integer not null default 0,
  progress_score integer not null default 0 check (progress_score between 0 and 100),
  pass_rate integer not null default 0 check (pass_rate between 0 and 100),
  proof_strength_score integer not null default 0 check (proof_strength_score between 0 and 100),
  client_readiness_score integer not null default 0 check (client_readiness_score between 0 and 100),
  executive_summary text not null default '',
  client_safe_summary text not null default '',
  limitations_summary text not null default '',
  blocked_claims jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.retest_items_v2 (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.retest_runs_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,
  developer_task_id uuid references public.developer_fix_tasks_v2(id) on delete set null,
  source_type text not null default 'manual',
  title text not null,
  status text not null default 'pending' check (status in ('pending','running','passed','failed','needs-review','blocked')),
  priority text not null default 'Medium' check (priority in ('Critical','High','Medium','Low','Info')),
  confidence text not null default 'Medium' check (confidence in ('Confirmed','High','Medium','Low','Needs manual review')),
  affected_area text not null default '',
  before_evidence text not null default '',
  fix_summary text not null default '',
  safe_retest_steps text not null default '',
  after_evidence text not null default '',
  verification_note text not null default '',
  client_result text not null default '',
  blocked_claim text not null default '',
  proof_fingerprint text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_portal_pro_links_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,
  retest_run_id uuid references public.retest_runs_v2(id) on delete set null,
  report_v4_snapshot_id uuid references public.client_report_v4_snapshots(id) on delete set null,
  developer_portal_id uuid references public.developer_fix_portals_v2(id) on delete set null,
  target_url text not null,
  share_token text not null unique default encode(gen_random_bytes(24),'hex'),
  status text not null default 'active' check (status in ('active','paused','expired','revoked')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  executive_score integer not null default 0 check (executive_score between 0 and 100),
  report_readiness_score integer not null default 0 check (report_readiness_score between 0 and 100),
  fix_progress_score integer not null default 0 check (fix_progress_score between 0 and 100),
  retest_pass_rate integer not null default 0 check (retest_pass_rate between 0 and 100),
  client_readiness_score integer not null default 0 check (client_readiness_score between 0 and 100),
  portal_summary text not null default '',
  limitations_summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_portal_pro_sections_v2 (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.client_portal_pro_links_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,
  section_key text not null,
  title text not null,
  section_type text not null default 'client-safe',
  display_order integer not null default 0,
  status_label text not null default 'Info',
  body text not null default '',
  evidence_summary text not null default '',
  action_summary text not null default '',
  blocked_claim text not null default '',
  created_at timestamptz not null default now(),
  unique(link_id, section_key)
);

create table if not exists public.retest_client_portal_events_v2 (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.retest_runs_v2(id) on delete cascade,
  link_id uuid references public.client_portal_pro_links_v2(id) on delete cascade,
  item_id uuid references public.retest_items_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,
  event_type text not null default 'event',
  severity text not null default 'Info' check (severity in ('Critical','High','Medium','Low','Info')),
  title text not null,
  details text not null,
  created_at timestamptz not null default now()
);

create index if not exists retest_runs_v2_user_idx on public.retest_runs_v2(user_id);
create index if not exists retest_runs_v2_scan_idx on public.retest_runs_v2(scan_id);
create index if not exists retest_items_v2_run_idx on public.retest_items_v2(run_id);
create index if not exists client_portal_pro_links_v2_token_idx on public.client_portal_pro_links_v2(share_token);
create index if not exists client_portal_pro_sections_v2_link_idx on public.client_portal_pro_sections_v2(link_id);

alter table public.retest_runs_v2 enable row level security;
alter table public.retest_items_v2 enable row level security;
alter table public.client_portal_pro_links_v2 enable row level security;
alter table public.client_portal_pro_sections_v2 enable row level security;
alter table public.retest_client_portal_events_v2 enable row level security;

-- owner/admin policies
create policy "read own retest runs v2" on public.retest_runs_v2 for select to authenticated using (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
create policy "insert own retest runs v2" on public.retest_runs_v2 for insert to authenticated with check (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
create policy "update own retest runs v2" on public.retest_runs_v2 for update to authenticated using (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin')) with check (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));

create policy "read own retest items v2" on public.retest_items_v2 for select to authenticated using (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
create policy "insert own retest items v2" on public.retest_items_v2 for insert to authenticated with check (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
create policy "update own retest items v2" on public.retest_items_v2 for update to authenticated using (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin')) with check (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));

create policy "read own portal pro links v2" on public.client_portal_pro_links_v2 for select to authenticated using (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
create policy "insert own portal pro links v2" on public.client_portal_pro_links_v2 for insert to authenticated with check (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
create policy "update own portal pro links v2" on public.client_portal_pro_links_v2 for update to authenticated using (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin')) with check (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));

create policy "read own portal pro sections v2" on public.client_portal_pro_sections_v2 for select to authenticated using (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
create policy "insert own portal pro sections v2" on public.client_portal_pro_sections_v2 for insert to authenticated with check (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));

create policy "read own retest events v2" on public.retest_client_portal_events_v2 for select to authenticated using (auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
create policy "insert own retest events v2" on public.retest_client_portal_events_v2 for insert to authenticated with check (user_id is null or auth.uid()=user_id or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));

-- public token policies for generated client portal pro only
create policy "anon read active portal pro link" on public.client_portal_pro_links_v2 for select to anon using (status='active' and expires_at > now());
create policy "anon read active portal pro sections" on public.client_portal_pro_sections_v2 for select to anon using (exists(select 1 from public.client_portal_pro_links_v2 l where l.id=client_portal_pro_sections_v2.link_id and l.status='active' and l.expires_at > now()));

create or replace function public.touch_retest_portal_v2() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists touch_retest_runs_v2 on public.retest_runs_v2;
create trigger touch_retest_runs_v2 before update on public.retest_runs_v2 for each row execute function public.touch_retest_portal_v2();
drop trigger if exists touch_retest_items_v2 on public.retest_items_v2;
create trigger touch_retest_items_v2 before update on public.retest_items_v2 for each row execute function public.touch_retest_portal_v2();
drop trigger if exists touch_portal_pro_links_v2 on public.client_portal_pro_links_v2;
create trigger touch_portal_pro_links_v2 before update on public.client_portal_pro_links_v2 for each row execute function public.touch_retest_portal_v2();
