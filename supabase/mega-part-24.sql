-- Mega Part 24: Customer Value Layer + Before/After Fix Tracking

create extension if not exists pgcrypto;

create table if not exists public.fix_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,
  first_seen_scan_id uuid references public.scans(id) on delete set null,
  last_seen_scan_id uuid references public.scans(id) on delete set null,

  fingerprint text not null,
  title text not null,
  category text not null default 'Security',
  severity text not null default 'Medium',
  source text not null default 'SecureMSME AI',
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'fixed', 'needs_review', 'accepted_risk')),

  evidence jsonb not null default '[]'::jsonb,
  customer_impact text not null default 'This issue may affect customer trust or security posture.',
  developer_fix text not null default 'Review the evidence and apply the recommended security fix.',
  owner_action text not null default 'Ask your developer or website vendor to review and fix this item.',
  proof_hint text not null default 'Run a retest after the fix. SecureMSME AI will compare before and after evidence.',

  notes text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  fixed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists fix_items_user_website_fingerprint_idx
  on public.fix_items(user_id, website_id, fingerprint)
  where website_id is not null;

create index if not exists fix_items_user_id_idx on public.fix_items(user_id);
create index if not exists fix_items_website_id_idx on public.fix_items(website_id);
create index if not exists fix_items_scan_id_idx on public.fix_items(scan_id);
create index if not exists fix_items_status_idx on public.fix_items(status);

alter table public.fix_items enable row level security;

drop policy if exists "Users can read own fix items" on public.fix_items;
create policy "Users can read own fix items"
on public.fix_items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own fix items" on public.fix_items;
create policy "Users can insert own fix items"
on public.fix_items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own fix items" on public.fix_items;
create policy "Users can update own fix items"
on public.fix_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own fix items" on public.fix_items;
create policy "Users can delete own fix items"
on public.fix_items
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_fix_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status = 'fixed' and old.status is distinct from 'fixed' then
    new.fixed_at = now();
  elsif new.status is distinct from 'fixed' then
    new.fixed_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists set_fix_items_updated_at on public.fix_items;
create trigger set_fix_items_updated_at
before update on public.fix_items
for each row
execute function public.set_fix_items_updated_at();
