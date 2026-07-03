create extension if not exists pgcrypto;

create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  url text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.websites add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.websites add column if not exists url text;
alter table public.websites add column if not exists name text;
alter table public.websites add column if not exists created_at timestamptz not null default now();
alter table public.websites add column if not exists updated_at timestamptz not null default now();

create unique index if not exists websites_user_url_unique
on public.websites(user_id, url);

create index if not exists websites_user_id_idx
on public.websites(user_id);

alter table public.scans add column if not exists website_id uuid references public.websites(id) on delete set null;

create index if not exists scans_website_id_idx
on public.scans(website_id);

create index if not exists scans_user_created_idx
on public.scans(user_id, created_at desc);

alter table public.websites enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'websites'
      and policyname = 'Users can view own websites'
  ) then
    create policy "Users can view own websites"
    on public.websites
    for select
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'websites'
      and policyname = 'Users can insert own websites'
  ) then
    create policy "Users can insert own websites"
    on public.websites
    for insert
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'websites'
      and policyname = 'Users can update own websites'
  ) then
    create policy "Users can update own websites"
    on public.websites
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'websites'
      and policyname = 'Users can delete own websites'
  ) then
    create policy "Users can delete own websites"
    on public.websites
    for delete
    using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_websites_updated_at on public.websites;

create trigger set_websites_updated_at
before update on public.websites
for each row
execute function public.set_updated_at();
