-- Part 5: SecureMSME AI SaaS database schema

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free',
  full_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text,
  website_url text not null,
  industry text,
  created_at timestamp with time zone default now()
);

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_url text not null,
  score integer not null,
  risk_level text not null,
  report jsonb not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount integer not null,
  currency text not null default 'INR',
  status text not null default 'created',
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;
alter table public.websites enable row level security;
alter table public.scans enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own websites" on public.websites;
drop policy if exists "Users can insert own websites" on public.websites;
drop policy if exists "Users can update own websites" on public.websites;
drop policy if exists "Users can delete own websites" on public.websites;
drop policy if exists "Users can view own scans" on public.scans;
drop policy if exists "Users can insert own scans" on public.scans;
drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Users can insert own payments" on public.payments;

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can view own websites"
on public.websites
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own websites"
on public.websites
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own websites"
on public.websites
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own websites"
on public.websites
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view own scans"
on public.scans
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own scans"
on public.scans
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can view own payments"
on public.payments
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own payments"
on public.payments
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
