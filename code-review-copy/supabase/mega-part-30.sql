-- Mega Part 30: Authorized Pentest Engine Worker Foundation

create extension if not exists pgcrypto;

create table if not exists public.authorized_pentest_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,

  target_url text not null,
  authorization_status text not null default 'verified-permission'
    check (authorization_status in ('verified-permission', 'revoked', 'expired')),
  intensity text not null default 'standard'
    check (intensity in ('light', 'standard', 'deep')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled', 'blocked')),

  scope_summary jsonb not null default '{}'::jsonb,
  allowed_modules jsonb not null default '[]'::jsonb,
  blocked_actions jsonb not null default '[]'::jsonb,
  safety_policy jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,

  total_modules integer not null default 0,
  completed_modules integer not null default 0,
  failed_modules integer not null default 0,
  blocked_modules integer not null default 0,

  permission_attested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.authorized_pentest_module_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.authorized_pentest_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,

  module_id text not null,
  module_name text not null,
  module_category text not null default 'Authorized Security Check',
  intensity text not null default 'standard',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'blocked', 'skipped')),

  requires_verified_scope boolean not null default true,
  risk_level text not null default 'safe',
  evidence jsonb not null default '[]'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  safe_claim text not null default '',
  blocked_claim text not null default '',

  started_at timestamptz,
  completed_at timestamptz,
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(run_id, module_id)
);

create table if not exists public.authorized_pentest_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.authorized_pentest_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,

  event_type text not null default 'info',
  title text not null,
  details text not null default '',
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists authorized_pentest_runs_user_id_idx on public.authorized_pentest_runs(user_id);
create index if not exists authorized_pentest_runs_website_id_idx on public.authorized_pentest_runs(website_id);
create index if not exists authorized_pentest_runs_source_scan_id_idx on public.authorized_pentest_runs(source_scan_id);
create index if not exists authorized_pentest_runs_status_idx on public.authorized_pentest_runs(status);

create index if not exists authorized_pentest_module_results_run_id_idx on public.authorized_pentest_module_results(run_id);
create index if not exists authorized_pentest_module_results_user_id_idx on public.authorized_pentest_module_results(user_id);
create index if not exists authorized_pentest_module_results_website_id_idx on public.authorized_pentest_module_results(website_id);

create index if not exists authorized_pentest_events_run_id_idx on public.authorized_pentest_events(run_id);
create index if not exists authorized_pentest_events_user_id_idx on public.authorized_pentest_events(user_id);
create index if not exists authorized_pentest_events_website_id_idx on public.authorized_pentest_events(website_id);

alter table public.authorized_pentest_runs enable row level security;
alter table public.authorized_pentest_module_results enable row level security;
alter table public.authorized_pentest_events enable row level security;

drop policy if exists "Users can read own authorized pentest runs" on public.authorized_pentest_runs;
create policy "Users can read own authorized pentest runs"
on public.authorized_pentest_runs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own authorized pentest runs" on public.authorized_pentest_runs;
create policy "Users can insert own authorized pentest runs"
on public.authorized_pentest_runs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own authorized pentest runs" on public.authorized_pentest_runs;
create policy "Users can update own authorized pentest runs"
on public.authorized_pentest_runs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own authorized pentest module results" on public.authorized_pentest_module_results;
create policy "Users can read own authorized pentest module results"
on public.authorized_pentest_module_results
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own authorized pentest module results" on public.authorized_pentest_module_results;
create policy "Users can insert own authorized pentest module results"
on public.authorized_pentest_module_results
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own authorized pentest module results" on public.authorized_pentest_module_results;
create policy "Users can update own authorized pentest module results"
on public.authorized_pentest_module_results
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own authorized pentest events" on public.authorized_pentest_events;
create policy "Users can read own authorized pentest events"
on public.authorized_pentest_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own authorized pentest events" on public.authorized_pentest_events;
create policy "Users can insert own authorized pentest events"
on public.authorized_pentest_events
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.set_authorized_pentest_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status = 'running' and old.status is distinct from 'running' then
    new.started_at = now();
  end if;

  if new.status in ('completed', 'failed', 'cancelled', 'blocked') and old.status is distinct from new.status then
    new.completed_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_authorized_pentest_runs_updated_at on public.authorized_pentest_runs;
create trigger set_authorized_pentest_runs_updated_at
before update on public.authorized_pentest_runs
for each row
execute function public.set_authorized_pentest_updated_at();

drop trigger if exists set_authorized_pentest_module_results_updated_at on public.authorized_pentest_module_results;
create trigger set_authorized_pentest_module_results_updated_at
before update on public.authorized_pentest_module_results
for each row
execute function public.set_authorized_pentest_updated_at();
