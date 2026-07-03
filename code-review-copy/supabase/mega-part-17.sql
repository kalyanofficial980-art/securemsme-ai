-- Mega Part 17: Admin role, admin RLS policies, and production admin access
-- Run this in Supabase SQL Editor.

alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists admin_notes text;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

update public.profiles
set role = 'admin'
where id in (
  select id
  from auth.users
  where email = 'kalyanofficial980@gmail.com'
);

drop policy if exists "admins can read all profiles" on public.profiles;
create policy "admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can update profiles" on public.profiles;
create policy "admins can update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can read all websites" on public.websites;
create policy "admins can read all websites"
on public.websites
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can read all scans" on public.scans;
create policy "admins can read all scans"
on public.scans
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can read all payments" on public.payments;
create policy "admins can read all payments"
on public.payments
for select
to authenticated
using (public.is_admin());

create index if not exists profiles_role_idx on public.profiles(role);
