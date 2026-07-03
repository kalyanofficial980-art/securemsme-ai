-- Mega Part 37: Advanced Crawler + Attack Surface Discovery Engine

create extension if not exists pgcrypto;

create table if not exists public.attack_surface_inventories (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,

  target_url text not null,
  crawler_status text not null default 'completed'
    check (crawler_status in ('planned', 'running', 'completed', 'completed-with-warnings', 'blocked', 'failed')),
  crawler_policy jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,

  route_count integer not null default 0,
  api_endpoint_count integer not null default 0,
  form_count integer not null default 0,
  input_count integer not null default 0,
  script_count integer not null default 0,
  parameter_count integer not null default 0,
  js_route_count integer not null default 0,
  blocked_count integer not null default 0,
  risk_signal_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attack_surface_items (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.attack_surface_inventories(id) on delete cascade,
  job_id uuid not null references public.international_scan_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,

  item_type text not null
    check (item_type in ('route', 'api-endpoint', 'form', 'input', 'parameter', 'script', 'link', 'javascript-route', 'resource', 'blocked-route', 'risk-signal')),
  method text,
  url text not null,
  path text,
  source_url text,
  status_code integer,
  content_type text,
  title text,
  risk_signal text,
  sensitivity text not null default 'low'
    check (sensitivity in ('low', 'medium', 'high')),
  evidence_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists attack_surface_inventories_job_id_idx on public.attack_surface_inventories(job_id);
create index if not exists attack_surface_inventories_user_id_idx on public.attack_surface_inventories(user_id);
create index if not exists attack_surface_inventories_website_id_idx on public.attack_surface_inventories(website_id);

create index if not exists attack_surface_items_inventory_id_idx on public.attack_surface_items(inventory_id);
create index if not exists attack_surface_items_job_id_idx on public.attack_surface_items(job_id);
create index if not exists attack_surface_items_user_id_idx on public.attack_surface_items(user_id);
create index if not exists attack_surface_items_type_idx on public.attack_surface_items(item_type);

alter table public.attack_surface_inventories enable row level security;
alter table public.attack_surface_items enable row level security;

drop policy if exists "Users and admins can read attack surface inventories" on public.attack_surface_inventories;
create policy "Users and admins can read attack surface inventories"
on public.attack_surface_inventories
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own attack surface inventories" on public.attack_surface_inventories;
create policy "Users can insert own attack surface inventories"
on public.attack_surface_inventories
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own attack surface inventories" on public.attack_surface_inventories;
create policy "Users can update own attack surface inventories"
on public.attack_surface_inventories
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read attack surface items" on public.attack_surface_items;
create policy "Users and admins can read attack surface items"
on public.attack_surface_items
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own attack surface items" on public.attack_surface_items;
create policy "Users can insert own attack surface items"
on public.attack_surface_items
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.set_attack_surface_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_attack_surface_inventories_updated_at on public.attack_surface_inventories;
create trigger set_attack_surface_inventories_updated_at
before update on public.attack_surface_inventories
for each row
execute function public.set_attack_surface_updated_at();
