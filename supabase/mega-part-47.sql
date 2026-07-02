-- Mega Part 47: Cron Worker Trigger + Due Job Batch Processor

create extension if not exists pgcrypto;

-- Part 46 queue compatibility hardening.
alter table if exists public.background_worker_jobs
  add column if not exists job_status text not null default 'queued',
  add column if not exists job_type text not null default 'monitoring-evaluation',
  add column if not exists scheduled_for timestamptz not null default now(),
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists completed_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists last_error text,
  add column if not exists attempts_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists result_summary jsonb not null default '{}'::jsonb;

create table if not exists public.cron_worker_batches (
  id uuid primary key default gen_random_uuid(),
  worker_name text not null default 'securemsme-cron-worker',
  trigger_source text not null default 'manual-admin'
    check (trigger_source in ('manual-admin', 'api-cron', 'vercel-cron', 'local-dev', 'unknown')),
  batch_status text not null default 'running'
    check (batch_status in ('running', 'completed', 'completed-with-errors', 'failed')),
  max_jobs integer not null default 5 check (max_jobs >= 1 and max_jobs <= 50),
  picked_count integer not null default 0,
  completed_count integer not null default 0,
  failed_count integer not null default 0,
  skipped_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  batch_summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cron_worker_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.cron_worker_batches(id) on delete cascade,
  background_job_id uuid references public.background_worker_jobs(id) on delete set null,
  monitoring_job_id uuid references public.monitoring_jobs(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  item_status text not null default 'picked'
    check (item_status in ('picked', 'completed', 'failed', 'skipped')),
  job_type text not null default 'monitoring-evaluation',
  details text,
  error_message text,
  result_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cron_worker_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.cron_worker_batches(id) on delete cascade,
  background_job_id uuid references public.background_worker_jobs(id) on delete set null,
  monitoring_job_id uuid references public.monitoring_jobs(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  event_type text not null default 'cron-info'
    check (event_type in ('cron-info', 'batch-started', 'batch-completed', 'job-picked', 'job-completed', 'job-failed', 'job-retry-scheduled', 'job-skipped')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cron_worker_batches_status_idx on public.cron_worker_batches(batch_status);
create index if not exists cron_worker_batches_created_at_idx on public.cron_worker_batches(created_at desc);
create index if not exists cron_worker_batch_items_batch_id_idx on public.cron_worker_batch_items(batch_id);
create index if not exists cron_worker_batch_items_job_id_idx on public.cron_worker_batch_items(background_job_id);
create index if not exists cron_worker_events_batch_id_idx on public.cron_worker_events(batch_id);
create index if not exists cron_worker_events_created_at_idx on public.cron_worker_events(created_at desc);

create index if not exists background_worker_jobs_due_idx
on public.background_worker_jobs(job_status, scheduled_for)
where job_status in ('queued', 'retrying');

alter table public.cron_worker_batches enable row level security;
alter table public.cron_worker_batch_items enable row level security;
alter table public.cron_worker_events enable row level security;

-- Admins can see all cron worker records. Normal users can see records connected to their jobs.
drop policy if exists "Admins can read cron worker batches" on public.cron_worker_batches;
create policy "Admins can read cron worker batches"
on public.cron_worker_batches
for select
to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can insert cron worker batches" on public.cron_worker_batches;
create policy "Admins can insert cron worker batches"
on public.cron_worker_batches
for insert
to authenticated
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can update cron worker batches" on public.cron_worker_batches;
create policy "Admins can update cron worker batches"
on public.cron_worker_batches
for update
to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can read cron batch items" on public.cron_worker_batch_items;
create policy "Admins can read cron batch items"
on public.cron_worker_batch_items
for select
to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can insert cron batch items" on public.cron_worker_batch_items;
create policy "Admins can insert cron batch items"
on public.cron_worker_batch_items
for insert
to authenticated
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can update cron batch items" on public.cron_worker_batch_items;
create policy "Admins can update cron batch items"
on public.cron_worker_batch_items
for update
to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can read cron events" on public.cron_worker_events;
create policy "Admins can read cron events"
on public.cron_worker_events
for select
to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can insert cron events" on public.cron_worker_events;
create policy "Admins can insert cron events"
on public.cron_worker_events
for insert
to authenticated
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
