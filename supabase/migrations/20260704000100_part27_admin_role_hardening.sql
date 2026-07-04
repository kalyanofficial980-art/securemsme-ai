-- Part 27: Admin role / plan self-upgrade hardening
-- Apply this migration to live Supabase before accepting real paid users.

create or replace function public.prevent_profile_privilege_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_role text := coalesce(auth.role(), '');
begin
  if tg_op = 'UPDATE' then
    if acting_role = 'service_role' then
      return new;
    end if;

    if
      (to_jsonb(new)->'role') is distinct from (to_jsonb(old)->'role')
      or (to_jsonb(new)->'plan') is distinct from (to_jsonb(old)->'plan')
      or (to_jsonb(new)->'is_admin') is distinct from (to_jsonb(old)->'is_admin')
      or (to_jsonb(new)->'subscription_status') is distinct from (to_jsonb(old)->'subscription_status')
      or (to_jsonb(new)->'billing_status') is distinct from (to_jsonb(old)->'billing_status')
      or (to_jsonb(new)->'trial_ends_at') is distinct from (to_jsonb(old)->'trial_ends_at')
      or (to_jsonb(new)->'subscription_ends_at') is distinct from (to_jsonb(old)->'subscription_ends_at')
    then
      raise exception 'Profile privilege and billing fields cannot be changed from client context.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop trigger if exists prevent_profile_privilege_self_update on public.profiles';
    execute 'create trigger prevent_profile_privilege_self_update before update on public.profiles for each row execute function public.prevent_profile_privilege_self_update()';
  end if;
end $$;

do $$
declare
  col record;
begin
  if to_regclass('public.profiles') is not null then
    for col in
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name in (
          'role',
          'plan',
          'is_admin',
          'subscription_status',
          'billing_status',
          'trial_ends_at',
          'subscription_ends_at'
        )
    loop
      execute format('revoke update (%I) on public.profiles from anon, authenticated', col.column_name);
    end loop;
  end if;
end $$;

comment on function public.prevent_profile_privilege_self_update()
is 'Prevents client-side self-upgrade of role, plan, and billing fields on profiles. Service role backend operations remain allowed.';
