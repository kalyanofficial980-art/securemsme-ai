-- Mega Part 20: External passive audit tool run history
-- Run this in Supabase SQL Editor before testing the import connector.

create extension if not exists pgcrypto;

create table if not exists public.audit_tool_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  website_url text not null,
  tool_name text not null,
  tool_mode text not null default 'passive',
  status text not null default 'completed',
  evidence_count integer not null default 0,
  high_count integer not null default 0,
  medium_count integer not null default 0,
  low_count integer not null default 0,
  info_count integer not null default 0,
  raw_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_tool_runs enable row level security;

drop policy if exists "users can read own audit tool runs" on public.audit_tool_runs;
create policy "users can read own audit tool runs"
on public.audit_tool_runs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own audit tool runs" on public.audit_tool_runs;
create policy "users can insert own audit tool runs"
on public.audit_tool_runs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "admins can read all audit tool runs" on public.audit_tool_runs;
create policy "admins can read all audit tool runs"
on public.audit_tool_runs
for select
to authenticated
using (public.is_admin());

create index if not exists audit_tool_runs_user_created_idx
on public.audit_tool_runs(user_id, created_at desc);

create index if not exists audit_tool_runs_scan_idx
on public.audit_tool_runs(scan_id);

create index if not exists audit_tool_runs_website_idx
on public.audit_tool_runs(website_id);
