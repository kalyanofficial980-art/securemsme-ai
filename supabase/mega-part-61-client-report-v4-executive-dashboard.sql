-- Mega Part 61: Client Report v4 + Executive Security Dashboard
create extension if not exists pgcrypto;

create table if not exists public.client_report_v4_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,
  report_title text not null default 'Client Security Report v4',
  target_url text not null,
  report_status text not null default 'draft' check (report_status in ('draft','ready','needs-review','archived')),
  report_version text not null default 'v4',
  executive_score integer not null default 0 check (executive_score between 0 and 100),
  report_readiness_score integer not null default 0 check (report_readiness_score between 0 and 100),
  business_risk_score integer not null default 0 check (business_risk_score between 0 and 100),
  technical_risk_score integer not null default 0 check (technical_risk_score between 0 and 100),
  evidence_strength_score integer not null default 0 check (evidence_strength_score between 0 and 100),
  confirmed_count integer not null default 0,
  high_confidence_count integer not null default 0,
  medium_confidence_count integer not null default 0,
  needs_manual_review_count integer not null default 0,
  open_action_count integer not null default 0,
  quick_win_count integer not null default 0,
  developer_task_count integer not null default 0,
  public_surface_summary text not null default '',
  authenticated_surface_summary text not null default '',
  api_surface_summary text not null default '',
  executive_summary text not null default '',
  business_impact_summary text not null default '',
  developer_summary text not null default '',
  client_safe_summary text not null default '',
  limitations_summary text not null default '',
  blocked_claims jsonb not null default '[]'::jsonb,
  source_counts jsonb not null default '{}'::jsonb,
  report_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_report_v4_sections (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.client_report_v4_snapshots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,
  section_key text not null,
  section_title text not null,
  section_type text not null default 'client-safe' check (section_type in ('executive','client-safe','developer','evidence','limitation','internal')),
  display_order integer not null default 0,
  visibility text not null default 'client' check (visibility in ('client','developer','internal')),
  confidence_level text not null default 'Medium' check (confidence_level in ('Confirmed','High','Medium','Low','Needs manual review')),
  risk_level text not null default 'Medium' check (risk_level in ('Critical','High','Medium','Low','Info')),
  section_body text not null default '',
  evidence_summary text not null default '',
  action_summary text not null default '',
  blocked_claim text not null default '',
  section_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(snapshot_id, section_key)
);

create table if not exists public.executive_security_metrics_v4 (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.client_report_v4_snapshots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,
  metric_key text not null,
  metric_label text not null,
  metric_value text not null,
  metric_score integer check (metric_score is null or metric_score between 0 and 100),
  metric_status text not null default 'neutral' check (metric_status in ('positive','neutral','warning','critical')),
  metric_category text not null default 'executive',
  explanation text not null default '',
  evidence_reference text not null default '',
  created_at timestamptz not null default now(),
  unique(snapshot_id, metric_key)
);

create table if not exists public.client_report_v4_events (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid references public.client_report_v4_snapshots(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,
  event_type text not null default 'report-event' check (event_type in ('report-generated','section-created','metric-created','report-event')),
  severity text not null default 'Info' check (severity in ('Critical','High','Medium','Low','Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists client_report_v4_snapshots_user_id_idx on public.client_report_v4_snapshots(user_id);
create index if not exists client_report_v4_snapshots_scan_id_idx on public.client_report_v4_snapshots(scan_id);
create index if not exists client_report_v4_sections_snapshot_id_idx on public.client_report_v4_sections(snapshot_id);
create index if not exists executive_security_metrics_v4_snapshot_id_idx on public.executive_security_metrics_v4(snapshot_id);
create index if not exists client_report_v4_events_snapshot_id_idx on public.client_report_v4_events(snapshot_id);

alter table public.client_report_v4_snapshots enable row level security;
alter table public.client_report_v4_sections enable row level security;
alter table public.executive_security_metrics_v4 enable row level security;
alter table public.client_report_v4_events enable row level security;

drop policy if exists "Users can read own client report v4 snapshots" on public.client_report_v4_snapshots;
create policy "Users can read own client report v4 snapshots" on public.client_report_v4_snapshots for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own client report v4 snapshots" on public.client_report_v4_snapshots;
create policy "Users can insert own client report v4 snapshots" on public.client_report_v4_snapshots for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own client report v4 snapshots" on public.client_report_v4_snapshots;
create policy "Users can update own client report v4 snapshots" on public.client_report_v4_snapshots for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own client report v4 sections" on public.client_report_v4_sections;
create policy "Users can read own client report v4 sections" on public.client_report_v4_sections for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own client report v4 sections" on public.client_report_v4_sections;
create policy "Users can insert own client report v4 sections" on public.client_report_v4_sections for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own executive metrics v4" on public.executive_security_metrics_v4;
create policy "Users can read own executive metrics v4" on public.executive_security_metrics_v4 for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own executive metrics v4" on public.executive_security_metrics_v4;
create policy "Users can insert own executive metrics v4" on public.executive_security_metrics_v4 for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own client report v4 events" on public.client_report_v4_events;
create policy "Users can read own client report v4 events" on public.client_report_v4_events for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own client report v4 events" on public.client_report_v4_events;
create policy "Users can insert own client report v4 events" on public.client_report_v4_events for insert to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_client_report_v4_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_client_report_v4_snapshots_updated_at on public.client_report_v4_snapshots;
create trigger touch_client_report_v4_snapshots_updated_at before update on public.client_report_v4_snapshots
for each row execute function public.touch_client_report_v4_updated_at();

drop trigger if exists touch_client_report_v4_sections_updated_at on public.client_report_v4_sections;
create trigger touch_client_report_v4_sections_updated_at before update on public.client_report_v4_sections
for each row execute function public.touch_client_report_v4_updated_at();
