-- Mega Part 56: Evidence Warehouse v2 + Proof Chain System
-- Defensive proof-chain layer for authorized security review evidence.

create extension if not exists pgcrypto;

create table if not exists public.security_evidence_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,
  workspace_id uuid references public.security_review_workspaces(id) on delete set null,
  orchestrator_job_id uuid references public.scan_orchestrator_jobs(id) on delete set null,
  engine_run_id uuid references public.scan_orchestrator_engine_runs(id) on delete set null,

  evidence_key text not null,
  source_type text not null default 'manual'
    check (source_type in (
      'scan',
      'orchestrator-engine',
      'vulnerability-finding',
      'accuracy-assessment',
      'workspace-item',
      'manual',
      'retest',
      'monitoring'
    )),
  source_id uuid,
  source_engine text,
  evidence_type text not null default 'observation'
    check (evidence_type in (
      'http-observation',
      'header-observation',
      'cookie-observation',
      'crawler-observation',
      'browser-observation',
      'api-observation',
      'cms-observation',
      'form-observation',
      'finding-evidence',
      'accuracy-evidence',
      'workspace-evidence',
      'retest-evidence',
      'monitoring-evidence',
      'manual-observation',
      'observation'
    )),
  evidence_category text not null default 'general',
  title text not null,
  summary text not null default '',
  affected_url text,
  observed_value text,
  expected_value text,
  proof_value text,
  safe_claim text not null default '',
  blocked_claim text not null default '',

  sensitivity_level text not null default 'client-safe'
    check (sensitivity_level in ('public', 'client-safe', 'technical', 'internal', 'sensitive')),
  confidence_level text not null default 'Medium'
    check (confidence_level in ('Confirmed', 'High', 'Medium', 'Low', 'Needs manual review')),
  evidence_quality text not null default 'partial'
    check (evidence_quality in ('strong', 'good', 'partial', 'weak', 'missing')),
  validation_status text not null default 'unvalidated'
    check (validation_status in ('unvalidated', 'validated', 'needs-review', 'rejected', 'expired')),
  integrity_status text not null default 'active'
    check (integrity_status in ('active', 'superseded', 'revoked', 'archived')),

  evidence_hash text not null,
  previous_hash text,
  chain_position integer not null default 1 check (chain_position >= 1),
  raw_evidence jsonb not null default '{}'::jsonb,
  redacted_evidence jsonb not null default '{}'::jsonb,

  captured_at timestamptz not null default now(),
  expires_at timestamptz,
  validated_by uuid references auth.users(id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, scan_id, evidence_key)
);

create table if not exists public.security_evidence_links (
  id uuid primary key default gen_random_uuid(),
  evidence_item_id uuid not null references public.security_evidence_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  linked_type text not null
    check (linked_type in (
      'vulnerability_finding',
      'accuracy_assessment',
      'workspace_bug_item',
      'report_section',
      'retest_result',
      'orchestrator_engine_run',
      'client_portal',
      'manual_reference'
    )),
  linked_id uuid,
  relationship text not null default 'supports'
    check (relationship in ('supports', 'contradicts', 'supersedes', 'duplicates', 'retest-of', 'derived-from', 'manual-reference')),
  link_summary text not null default '',

  created_at timestamptz not null default now()
);

create table if not exists public.security_proof_chains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,
  workspace_id uuid references public.security_review_workspaces(id) on delete set null,

  chain_name text not null default 'Security Evidence Proof Chain',
  chain_status text not null default 'active'
    check (chain_status in ('active', 'completed', 'superseded', 'revoked', 'archived')),
  root_hash text not null default '',
  latest_hash text not null default '',
  total_evidence_items integer not null default 0,
  validated_items integer not null default 0,
  needs_review_items integer not null default 0,
  rejected_items integer not null default 0,
  strong_items integer not null default 0,
  client_safe_items integer not null default 0,
  technical_items integer not null default 0,

  completeness_score integer not null default 0 check (completeness_score >= 0 and completeness_score <= 100),
  proof_summary text not null default '',
  client_safe_summary text not null default '',
  technical_summary text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, scan_id)
);

create table if not exists public.security_evidence_snapshots (
  id uuid primary key default gen_random_uuid(),
  proof_chain_id uuid not null references public.security_proof_chains(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  snapshot_name text not null default 'Evidence Snapshot',
  snapshot_type text not null default 'manual'
    check (snapshot_type in ('manual', 'pre-report', 'post-retest', 'client-share', 'monthly-monitoring')),
  snapshot_hash text not null,
  evidence_count integer not null default 0,
  validated_count integer not null default 0,
  completeness_score integer not null default 0 check (completeness_score >= 0 and completeness_score <= 100),
  snapshot_summary text not null default '',
  snapshot_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.security_evidence_events (
  id uuid primary key default gen_random_uuid(),
  proof_chain_id uuid references public.security_proof_chains(id) on delete cascade,
  evidence_item_id uuid references public.security_evidence_items(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete cascade,

  event_type text not null default 'evidence-event'
    check (event_type in (
      'warehouse-created',
      'evidence-synced',
      'evidence-added',
      'evidence-validated',
      'evidence-rejected',
      'snapshot-created',
      'proof-chain-updated',
      'evidence-event'
    )),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists security_evidence_items_user_id_idx on public.security_evidence_items(user_id);
create index if not exists security_evidence_items_scan_id_idx on public.security_evidence_items(scan_id);
create index if not exists security_evidence_items_workspace_id_idx on public.security_evidence_items(workspace_id);
create index if not exists security_evidence_items_source_idx on public.security_evidence_items(source_type, source_id);
create index if not exists security_evidence_items_type_idx on public.security_evidence_items(evidence_type);
create index if not exists security_evidence_items_hash_idx on public.security_evidence_items(evidence_hash);
create index if not exists security_evidence_items_validation_idx on public.security_evidence_items(validation_status);
create index if not exists security_evidence_items_created_at_idx on public.security_evidence_items(created_at desc);

create index if not exists security_evidence_links_evidence_id_idx on public.security_evidence_links(evidence_item_id);
create index if not exists security_evidence_links_linked_idx on public.security_evidence_links(linked_type, linked_id);

create index if not exists security_proof_chains_user_id_idx on public.security_proof_chains(user_id);
create index if not exists security_proof_chains_scan_id_idx on public.security_proof_chains(scan_id);
create index if not exists security_proof_chains_status_idx on public.security_proof_chains(chain_status);

create index if not exists security_evidence_snapshots_chain_id_idx on public.security_evidence_snapshots(proof_chain_id);
create index if not exists security_evidence_events_chain_id_idx on public.security_evidence_events(proof_chain_id);
create index if not exists security_evidence_events_created_at_idx on public.security_evidence_events(created_at desc);

alter table public.security_evidence_items enable row level security;
alter table public.security_evidence_links enable row level security;
alter table public.security_proof_chains enable row level security;
alter table public.security_evidence_snapshots enable row level security;
alter table public.security_evidence_events enable row level security;

drop policy if exists "Users can read own evidence items" on public.security_evidence_items;
create policy "Users can read own evidence items"
on public.security_evidence_items
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own evidence items" on public.security_evidence_items;
create policy "Users can insert own evidence items"
on public.security_evidence_items
for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can update own evidence items" on public.security_evidence_items;
create policy "Users can update own evidence items"
on public.security_evidence_items
for update
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
)
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can read own evidence links" on public.security_evidence_links;
create policy "Users can read own evidence links"
on public.security_evidence_links
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own evidence links" on public.security_evidence_links;
create policy "Users can insert own evidence links"
on public.security_evidence_links
for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can read own proof chains" on public.security_proof_chains;
create policy "Users can read own proof chains"
on public.security_proof_chains
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own proof chains" on public.security_proof_chains;
create policy "Users can insert own proof chains"
on public.security_proof_chains
for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can update own proof chains" on public.security_proof_chains;
create policy "Users can update own proof chains"
on public.security_proof_chains
for update
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
)
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can read own evidence snapshots" on public.security_evidence_snapshots;
create policy "Users can read own evidence snapshots"
on public.security_evidence_snapshots
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own evidence snapshots" on public.security_evidence_snapshots;
create policy "Users can insert own evidence snapshots"
on public.security_evidence_snapshots
for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can read own evidence events" on public.security_evidence_events;
create policy "Users can read own evidence events"
on public.security_evidence_events
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own evidence events" on public.security_evidence_events;
create policy "Users can insert own evidence events"
on public.security_evidence_events
for insert
to authenticated
with check (
  user_id is null
  or auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

create or replace function public.touch_evidence_warehouse_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_security_evidence_items_updated_at on public.security_evidence_items;
create trigger touch_security_evidence_items_updated_at
before update on public.security_evidence_items
for each row
execute function public.touch_evidence_warehouse_updated_at();

drop trigger if exists touch_security_proof_chains_updated_at on public.security_proof_chains;
create trigger touch_security_proof_chains_updated_at
before update on public.security_proof_chains
for each row
execute function public.touch_evidence_warehouse_updated_at();

create or replace function public.recalculate_security_proof_chain(p_chain_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_scan_id uuid;
  v_total integer;
  v_validated integer;
  v_needs_review integer;
  v_rejected integer;
  v_strong integer;
  v_client_safe integer;
  v_technical integer;
  v_root_hash text;
  v_latest_hash text;
  v_completeness integer;
begin
  select user_id, scan_id into v_user_id, v_scan_id
  from public.security_proof_chains
  where id = p_chain_id;

  select
    count(*),
    count(*) filter (where validation_status = 'validated'),
    count(*) filter (where validation_status = 'needs-review'),
    count(*) filter (where validation_status = 'rejected'),
    count(*) filter (where evidence_quality in ('strong', 'good')),
    count(*) filter (where sensitivity_level in ('public', 'client-safe')),
    count(*) filter (where sensitivity_level in ('technical', 'internal', 'sensitive'))
  into
    v_total, v_validated, v_needs_review, v_rejected, v_strong, v_client_safe, v_technical
  from public.security_evidence_items
  where user_id = v_user_id
  and scan_id = v_scan_id
  and integrity_status = 'active';

  select evidence_hash into v_root_hash
  from public.security_evidence_items
  where user_id = v_user_id
  and scan_id = v_scan_id
  and integrity_status = 'active'
  order by chain_position asc, created_at asc
  limit 1;

  select evidence_hash into v_latest_hash
  from public.security_evidence_items
  where user_id = v_user_id
  and scan_id = v_scan_id
  and integrity_status = 'active'
  order by chain_position desc, created_at desc
  limit 1;

  if coalesce(v_total, 0) = 0 then
    v_completeness := 0;
  else
    v_completeness := least(100, round((
      (coalesce(v_validated, 0)::numeric / greatest(v_total, 1)::numeric) * 45
      + (coalesce(v_strong, 0)::numeric / greatest(v_total, 1)::numeric) * 35
      + (case when coalesce(v_client_safe, 0) > 0 then 10 else 0 end)
      + (case when coalesce(v_latest_hash, '') <> '' then 10 else 0 end)
    )));
  end if;

  update public.security_proof_chains
  set
    total_evidence_items = coalesce(v_total, 0),
    validated_items = coalesce(v_validated, 0),
    needs_review_items = coalesce(v_needs_review, 0),
    rejected_items = coalesce(v_rejected, 0),
    strong_items = coalesce(v_strong, 0),
    client_safe_items = coalesce(v_client_safe, 0),
    technical_items = coalesce(v_technical, 0),
    root_hash = coalesce(v_root_hash, ''),
    latest_hash = coalesce(v_latest_hash, ''),
    completeness_score = v_completeness,
    proof_summary = coalesce(v_total, 0) || ' evidence item(s), ' || coalesce(v_validated, 0) || ' validated, proof completeness ' || v_completeness || '%.',
    client_safe_summary = coalesce(v_client_safe, 0) || ' client-safe evidence item(s) available for report support.',
    technical_summary = coalesce(v_technical, 0) || ' technical/internal evidence item(s) available for expert review.',
    updated_at = now()
  where id = p_chain_id;
end;
$$;
