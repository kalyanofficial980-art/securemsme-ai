-- Mega Part 58: Advanced Crawler + Asset Discovery v2
-- Safe same-origin crawler and asset discovery for authorized security reviews.

create extension if not exists pgcrypto;

create table if not exists public.advanced_crawler_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,
  orchestrator_job_id uuid references public.scan_orchestrator_jobs(id) on delete set null,
  proof_chain_id uuid references public.security_proof_chains(id) on delete set null,

  target_url text not null,
  normalized_origin text not null,
  run_status text not null default 'completed'
    check (run_status in ('completed', 'completed-with-warnings', 'blocked', 'failed')),
  crawler_mode text not null default 'safe-standard'
    check (crawler_mode in ('safe-light', 'safe-standard', 'safe-deep')),
  authorization_status text not null default 'user-attested'
    check (authorization_status in ('user-attested', 'verified-scope', 'blocked')),

  max_pages integer not null default 25 check (max_pages >= 1 and max_pages <= 250),
  max_depth integer not null default 2 check (max_depth >= 0 and max_depth <= 5),
  discovered_url_count integer not null default 0,
  crawled_page_count integer not null default 0,
  skipped_url_count integer not null default 0,
  blocked_url_count integer not null default 0,
  form_count integer not null default 0,
  login_surface_count integer not null default 0,
  admin_surface_count integer not null default 0,
  api_surface_count integer not null default 0,
  checkout_surface_count integer not null default 0,
  customer_data_surface_count integer not null default 0,

  coverage_score integer not null default 0 check (coverage_score >= 0 and coverage_score <= 100),
  asset_risk_score integer not null default 0 check (asset_risk_score >= 0 and asset_risk_score <= 100),
  safe_summary text not null default '',
  developer_summary text not null default '',
  client_safe_summary text not null default '',
  blocked_actions jsonb not null default '[]'::jsonb,
  crawler_report jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.discovered_assets_v2 (
  id uuid primary key default gen_random_uuid(),
  crawler_run_id uuid not null references public.advanced_crawler_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  asset_url text not null,
  normalized_url text not null,
  origin text not null,
  path text not null default '/',
  depth integer not null default 0 check (depth >= 0 and depth <= 10),
  parent_url text,

  asset_type text not null default 'page'
    check (asset_type in (
      'page',
      'login',
      'admin',
      'checkout',
      'payment',
      'api',
      'documentation',
      'form',
      'privacy',
      'contact',
      'sitemap',
      'robots',
      'static',
      'unknown'
    )),
  http_status integer,
  content_type text,
  title text,
  meta_description text,
  discovery_source text not null default 'crawler'
    check (discovery_source in ('seed', 'crawler', 'sitemap', 'robots', 'link', 'form', 'script', 'manual')),

  has_form boolean not null default false,
  has_password_field boolean not null default false,
  has_customer_data_field boolean not null default false,
  has_payment_signal boolean not null default false,
  has_admin_signal boolean not null default false,
  has_api_signal boolean not null default false,
  is_same_origin boolean not null default true,
  is_crawled boolean not null default false,
  is_blocked boolean not null default false,

  risk_tags text[] not null default array[]::text[],
  asset_fingerprint text not null,
  evidence_summary text not null default '',
  developer_note text not null default '',
  client_safe_note text not null default '',
  raw_observation jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(crawler_run_id, normalized_url)
);

create table if not exists public.crawler_link_edges_v2 (
  id uuid primary key default gen_random_uuid(),
  crawler_run_id uuid not null references public.advanced_crawler_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,

  from_url text not null,
  to_url text not null,
  link_text text,
  relationship text not null default 'links-to'
    check (relationship in ('links-to', 'form-action', 'script-src', 'sitemap-entry', 'robots-reference', 'redirects-to')),
  is_same_origin boolean not null default true,

  created_at timestamptz not null default now()
);

create table if not exists public.crawler_form_inventory_v2 (
  id uuid primary key default gen_random_uuid(),
  crawler_run_id uuid not null references public.advanced_crawler_runs(id) on delete cascade,
  asset_id uuid references public.discovered_assets_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,

  page_url text not null,
  form_index integer not null default 0,
  method text not null default 'GET',
  action_url text,
  field_count integer not null default 0,
  password_field_count integer not null default 0,
  email_field_count integer not null default 0,
  phone_field_count integer not null default 0,
  file_field_count integer not null default 0,
  payment_field_signal boolean not null default false,
  customer_data_signal boolean not null default false,
  csrf_signal boolean not null default false,

  form_risk_level text not null default 'Medium'
    check (form_risk_level in ('High', 'Medium', 'Low', 'Info')),
  evidence_summary text not null default '',
  developer_note text not null default '',
  safe_claim text not null default '',
  blocked_claim text not null default '',
  raw_form jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.asset_discovery_snapshots_v2 (
  id uuid primary key default gen_random_uuid(),
  crawler_run_id uuid not null references public.advanced_crawler_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  snapshot_name text not null default 'Asset Discovery Snapshot',
  snapshot_hash text not null,
  asset_count integer not null default 0,
  form_count integer not null default 0,
  login_surface_count integer not null default 0,
  admin_surface_count integer not null default 0,
  api_surface_count integer not null default 0,
  checkout_surface_count integer not null default 0,
  summary text not null default '',
  snapshot_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.advanced_crawler_events (
  id uuid primary key default gen_random_uuid(),
  crawler_run_id uuid references public.advanced_crawler_runs(id) on delete cascade,
  asset_id uuid references public.discovered_assets_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  event_type text not null default 'crawler-event'
    check (event_type in (
      'crawler-started',
      'crawler-completed',
      'crawler-blocked',
      'asset-discovered',
      'form-inventoried',
      'snapshot-created',
      'crawler-event'
    )),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists advanced_crawler_runs_user_id_idx on public.advanced_crawler_runs(user_id);
create index if not exists advanced_crawler_runs_scan_id_idx on public.advanced_crawler_runs(scan_id);
create index if not exists advanced_crawler_runs_created_at_idx on public.advanced_crawler_runs(created_at desc);

create index if not exists discovered_assets_v2_run_id_idx on public.discovered_assets_v2(crawler_run_id);
create index if not exists discovered_assets_v2_scan_id_idx on public.discovered_assets_v2(scan_id);
create index if not exists discovered_assets_v2_asset_type_idx on public.discovered_assets_v2(asset_type);
create index if not exists discovered_assets_v2_fingerprint_idx on public.discovered_assets_v2(asset_fingerprint);
create index if not exists discovered_assets_v2_created_at_idx on public.discovered_assets_v2(created_at desc);

create index if not exists crawler_link_edges_v2_run_id_idx on public.crawler_link_edges_v2(crawler_run_id);
create index if not exists crawler_form_inventory_v2_run_id_idx on public.crawler_form_inventory_v2(crawler_run_id);
create index if not exists asset_discovery_snapshots_v2_run_id_idx on public.asset_discovery_snapshots_v2(crawler_run_id);
create index if not exists advanced_crawler_events_run_id_idx on public.advanced_crawler_events(crawler_run_id);
create index if not exists advanced_crawler_events_created_at_idx on public.advanced_crawler_events(created_at desc);

alter table public.advanced_crawler_runs enable row level security;
alter table public.discovered_assets_v2 enable row level security;
alter table public.crawler_link_edges_v2 enable row level security;
alter table public.crawler_form_inventory_v2 enable row level security;
alter table public.asset_discovery_snapshots_v2 enable row level security;
alter table public.advanced_crawler_events enable row level security;

drop policy if exists "Users can read own advanced crawler runs" on public.advanced_crawler_runs;
create policy "Users can read own advanced crawler runs"
on public.advanced_crawler_runs
for select
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own advanced crawler runs" on public.advanced_crawler_runs;
create policy "Users can insert own advanced crawler runs"
on public.advanced_crawler_runs
for insert
to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own discovered assets v2" on public.discovered_assets_v2;
create policy "Users can read own discovered assets v2"
on public.discovered_assets_v2
for select
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own discovered assets v2" on public.discovered_assets_v2;
create policy "Users can insert own discovered assets v2"
on public.discovered_assets_v2
for insert
to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own discovered assets v2" on public.discovered_assets_v2;
create policy "Users can update own discovered assets v2"
on public.discovered_assets_v2
for update
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own crawler link edges v2" on public.crawler_link_edges_v2;
create policy "Users can read own crawler link edges v2"
on public.crawler_link_edges_v2
for select
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own crawler link edges v2" on public.crawler_link_edges_v2;
create policy "Users can insert own crawler link edges v2"
on public.crawler_link_edges_v2
for insert
to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own crawler forms v2" on public.crawler_form_inventory_v2;
create policy "Users can read own crawler forms v2"
on public.crawler_form_inventory_v2
for select
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own crawler forms v2" on public.crawler_form_inventory_v2;
create policy "Users can insert own crawler forms v2"
on public.crawler_form_inventory_v2
for insert
to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own crawler snapshots v2" on public.asset_discovery_snapshots_v2;
create policy "Users can read own crawler snapshots v2"
on public.asset_discovery_snapshots_v2
for select
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own crawler snapshots v2" on public.asset_discovery_snapshots_v2;
create policy "Users can insert own crawler snapshots v2"
on public.asset_discovery_snapshots_v2
for insert
to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own advanced crawler events" on public.advanced_crawler_events;
create policy "Users can read own advanced crawler events"
on public.advanced_crawler_events
for select
to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own advanced crawler events" on public.advanced_crawler_events;
create policy "Users can insert own advanced crawler events"
on public.advanced_crawler_events
for insert
to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_discovered_assets_v2_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_discovered_assets_v2_updated_at on public.discovered_assets_v2;
create trigger touch_discovered_assets_v2_updated_at
before update on public.discovered_assets_v2
for each row
execute function public.touch_discovered_assets_v2_updated_at();
