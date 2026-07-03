-- Mega Part 60: API Security Review v2
-- Safe API security review workflow for authorized targets. GET/HEAD metadata only.

create extension if not exists pgcrypto;

create table if not exists public.api_security_review_runs_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,
  crawler_run_id uuid references public.advanced_crawler_runs(id) on delete set null,
  proof_chain_id uuid references public.security_proof_chains(id) on delete set null,

  target_url text not null,
  normalized_origin text not null,
  run_status text not null default 'completed'
    check (run_status in ('completed', 'completed-with-warnings', 'blocked', 'failed')),
  review_mode text not null default 'safe-standard'
    check (review_mode in ('safe-light', 'safe-standard', 'safe-deep')),
  authorization_status text not null default 'user-attested'
    check (authorization_status in ('user-attested', 'verified-scope', 'blocked')),

  discovered_spec_count integer not null default 0,
  endpoint_count integer not null default 0,
  public_docs_count integer not null default 0,
  graphql_signal_count integer not null default 0,
  sensitive_endpoint_count integer not null default 0,
  mutation_endpoint_count integer not null default 0,
  auth_required_count integer not null default 0,
  auth_unclear_count integer not null default 0,
  checklist_needs_fix_count integer not null default 0,

  api_coverage_score integer not null default 0 check (api_coverage_score >= 0 and api_coverage_score <= 100),
  api_risk_score integer not null default 0 check (api_risk_score >= 0 and api_risk_score <= 100),
  safe_summary text not null default '',
  developer_summary text not null default '',
  client_safe_summary text not null default '',
  blocked_actions jsonb not null default '[]'::jsonb,
  review_report jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.api_discovered_specs_v2 (
  id uuid primary key default gen_random_uuid(),
  review_run_id uuid not null references public.api_security_review_runs_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  spec_url text not null,
  spec_type text not null default 'unknown'
    check (spec_type in ('openapi-json', 'openapi-yaml', 'swagger-ui', 'graphql', 'api-docs', 'unknown')),
  http_status integer,
  content_type text,
  title text,
  version text,
  is_public boolean not null default true,
  endpoint_count integer not null default 0,
  method_count integer not null default 0,
  auth_scheme_count integer not null default 0,
  sensitive_path_count integer not null default 0,

  risk_level text not null default 'Medium'
    check (risk_level in ('High', 'Medium', 'Low', 'Info')),
  evidence_summary text not null default '',
  developer_note text not null default '',
  client_safe_note text not null default '',
  blocked_claim text not null default '',
  spec_fingerprint text not null,
  raw_summary jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  unique(review_run_id, spec_url)
);

create table if not exists public.api_endpoint_inventory_v2 (
  id uuid primary key default gen_random_uuid(),
  review_run_id uuid not null references public.api_security_review_runs_v2(id) on delete cascade,
  spec_id uuid references public.api_discovered_specs_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  endpoint_path text not null,
  full_url text,
  method text not null default 'GET',
  operation_id text,
  summary text,
  endpoint_group text not null default 'general',
  endpoint_type text not null default 'api-endpoint'
    check (endpoint_type in ('api-endpoint', 'auth-endpoint', 'user-data', 'admin-api', 'payment-api', 'file-api', 'graphql', 'documentation', 'unknown')),

  auth_requirement text not null default 'unclear'
    check (auth_requirement in ('required', 'optional', 'none-documented', 'unclear')),
  mutation_risk boolean not null default false,
  customer_data_signal boolean not null default false,
  admin_signal boolean not null default false,
  payment_signal boolean not null default false,
  file_signal boolean not null default false,
  sensitive_signal boolean not null default false,

  risk_level text not null default 'Medium'
    check (risk_level in ('High', 'Medium', 'Low', 'Info')),
  review_status text not null default 'needs-review'
    check (review_status in ('reviewed', 'needs-review', 'accepted-risk', 'false-positive')),
  endpoint_fingerprint text not null,
  evidence_summary text not null default '',
  developer_note text not null default '',
  client_safe_note text not null default '',
  blocked_claim text not null default '',
  raw_operation jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  unique(review_run_id, endpoint_path, method)
);

create table if not exists public.api_security_observations_v2 (
  id uuid primary key default gen_random_uuid(),
  review_run_id uuid not null references public.api_security_review_runs_v2(id) on delete cascade,
  endpoint_id uuid references public.api_endpoint_inventory_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,

  observation_key text not null,
  category text not null default 'API Security',
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  confidence text not null default 'Medium'
    check (confidence in ('Confirmed', 'High', 'Medium', 'Low', 'Needs manual review')),
  title text not null,
  evidence_summary text not null default '',
  developer_note text not null default '',
  client_safe_note text not null default '',
  blocked_claim text not null default '',
  safe_retest_steps text not null default '',
  observation_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.api_review_checklist_items_v2 (
  id uuid primary key default gen_random_uuid(),
  review_run_id uuid not null references public.api_security_review_runs_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,

  checklist_key text not null,
  title text not null,
  category text not null default 'API Security',
  status text not null default 'not-checked'
    check (status in ('pass', 'needs-fix', 'not-checked', 'not-applicable', 'accepted-risk')),
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  evidence_summary text not null default '',
  developer_note text not null default '',
  client_safe_note text not null default '',
  blocked_claim text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(review_run_id, checklist_key)
);

create table if not exists public.api_security_review_events_v2 (
  id uuid primary key default gen_random_uuid(),
  review_run_id uuid references public.api_security_review_runs_v2(id) on delete cascade,
  spec_id uuid references public.api_discovered_specs_v2(id) on delete cascade,
  endpoint_id uuid references public.api_endpoint_inventory_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  event_type text not null default 'api-review-event'
    check (event_type in ('api-review-started', 'api-review-completed', 'spec-discovered', 'endpoint-inventoried', 'observation-created', 'checklist-updated', 'api-review-event')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists api_security_review_runs_v2_user_id_idx on public.api_security_review_runs_v2(user_id);
create index if not exists api_security_review_runs_v2_scan_id_idx on public.api_security_review_runs_v2(scan_id);
create index if not exists api_security_review_runs_v2_created_at_idx on public.api_security_review_runs_v2(created_at desc);
create index if not exists api_discovered_specs_v2_run_id_idx on public.api_discovered_specs_v2(review_run_id);
create index if not exists api_endpoint_inventory_v2_run_id_idx on public.api_endpoint_inventory_v2(review_run_id);
create index if not exists api_endpoint_inventory_v2_type_idx on public.api_endpoint_inventory_v2(endpoint_type);
create index if not exists api_endpoint_inventory_v2_risk_idx on public.api_endpoint_inventory_v2(risk_level);
create index if not exists api_security_observations_v2_run_id_idx on public.api_security_observations_v2(review_run_id);
create index if not exists api_review_checklist_v2_run_id_idx on public.api_review_checklist_items_v2(review_run_id);
create index if not exists api_security_events_v2_run_id_idx on public.api_security_review_events_v2(review_run_id);

alter table public.api_security_review_runs_v2 enable row level security;
alter table public.api_discovered_specs_v2 enable row level security;
alter table public.api_endpoint_inventory_v2 enable row level security;
alter table public.api_security_observations_v2 enable row level security;
alter table public.api_review_checklist_items_v2 enable row level security;
alter table public.api_security_review_events_v2 enable row level security;

drop policy if exists "Users can read own API review runs v2" on public.api_security_review_runs_v2;
create policy "Users can read own API review runs v2" on public.api_security_review_runs_v2 for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own API review runs v2" on public.api_security_review_runs_v2;
create policy "Users can insert own API review runs v2" on public.api_security_review_runs_v2 for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own API specs v2" on public.api_discovered_specs_v2;
create policy "Users can read own API specs v2" on public.api_discovered_specs_v2 for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own API specs v2" on public.api_discovered_specs_v2;
create policy "Users can insert own API specs v2" on public.api_discovered_specs_v2 for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own API endpoints v2" on public.api_endpoint_inventory_v2;
create policy "Users can read own API endpoints v2" on public.api_endpoint_inventory_v2 for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own API endpoints v2" on public.api_endpoint_inventory_v2;
create policy "Users can insert own API endpoints v2" on public.api_endpoint_inventory_v2 for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own API endpoints v2" on public.api_endpoint_inventory_v2;
create policy "Users can update own API endpoints v2" on public.api_endpoint_inventory_v2 for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own API observations v2" on public.api_security_observations_v2;
create policy "Users can read own API observations v2" on public.api_security_observations_v2 for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own API observations v2" on public.api_security_observations_v2;
create policy "Users can insert own API observations v2" on public.api_security_observations_v2 for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own API checklist v2" on public.api_review_checklist_items_v2;
create policy "Users can read own API checklist v2" on public.api_review_checklist_items_v2 for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own API checklist v2" on public.api_review_checklist_items_v2;
create policy "Users can insert own API checklist v2" on public.api_review_checklist_items_v2 for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own API checklist v2" on public.api_review_checklist_items_v2;
create policy "Users can update own API checklist v2" on public.api_review_checklist_items_v2 for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own API events v2" on public.api_security_review_events_v2;
create policy "Users can read own API events v2" on public.api_security_review_events_v2 for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own API events v2" on public.api_security_review_events_v2;
create policy "Users can insert own API events v2" on public.api_security_review_events_v2 for insert to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_api_security_review_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_api_review_checklist_v2_updated_at on public.api_review_checklist_items_v2;
create trigger touch_api_review_checklist_v2_updated_at
before update on public.api_review_checklist_items_v2
for each row execute function public.touch_api_security_review_v2_updated_at();
