-- Mega Part 38: API Discovery + OpenAPI Security Scanner

create extension if not exists pgcrypto;

create table if not exists public.api_security_inventories (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,

  target_url text not null,
  scanner_status text not null default 'completed'
    check (scanner_status in ('planned', 'running', 'completed', 'completed-with-warnings', 'blocked', 'failed')),
  scanner_policy jsonb not null default '{}'::jsonb,
  openapi_documents jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,

  document_count integer not null default 0,
  endpoint_count integer not null default 0,
  get_endpoint_count integer not null default 0,
  mutation_method_count integer not null default 0,
  auth_unknown_count integer not null default 0,
  sensitive_path_count integer not null default 0,
  api_risk_signal_count integer not null default 0,
  blocked_execution_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_security_endpoints (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.api_security_inventories(id) on delete cascade,
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,

  endpoint_url text not null,
  path text not null,
  method text not null,
  source text not null default 'discovered',
  auth_requirement text not null default 'unknown'
    check (auth_requirement in ('required', 'optional', 'none-observed', 'unknown')),
  risk_level text not null default 'Info'
    check (risk_level in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  risk_signals jsonb not null default '[]'::jsonb,
  parameters jsonb not null default '[]'::jsonb,
  response_metadata jsonb not null default '{}'::jsonb,
  api_top10_mapping jsonb not null default '[]'::jsonb,
  safe_testing_notes text not null default '',

  created_at timestamptz not null default now()
);

create index if not exists api_security_inventories_job_id_idx on public.api_security_inventories(job_id);
create index if not exists api_security_inventories_user_id_idx on public.api_security_inventories(user_id);
create index if not exists api_security_inventories_website_id_idx on public.api_security_inventories(website_id);

create index if not exists api_security_endpoints_inventory_id_idx on public.api_security_endpoints(inventory_id);
create index if not exists api_security_endpoints_job_id_idx on public.api_security_endpoints(job_id);
create index if not exists api_security_endpoints_user_id_idx on public.api_security_endpoints(user_id);
create index if not exists api_security_endpoints_method_idx on public.api_security_endpoints(method);
create index if not exists api_security_endpoints_risk_level_idx on public.api_security_endpoints(risk_level);

alter table public.api_security_inventories enable row level security;
alter table public.api_security_endpoints enable row level security;

drop policy if exists "Users and admins can read api security inventories" on public.api_security_inventories;
create policy "Users and admins can read api security inventories"
on public.api_security_inventories
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own api security inventories" on public.api_security_inventories;
create policy "Users can insert own api security inventories"
on public.api_security_inventories
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own api security inventories" on public.api_security_inventories;
create policy "Users can update own api security inventories"
on public.api_security_inventories
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read api security endpoints" on public.api_security_endpoints;
create policy "Users and admins can read api security endpoints"
on public.api_security_endpoints
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own api security endpoints" on public.api_security_endpoints;
create policy "Users can insert own api security endpoints"
on public.api_security_endpoints
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.set_api_security_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_api_security_inventories_updated_at on public.api_security_inventories;
create trigger set_api_security_inventories_updated_at
before update on public.api_security_inventories
for each row
execute function public.set_api_security_updated_at();
