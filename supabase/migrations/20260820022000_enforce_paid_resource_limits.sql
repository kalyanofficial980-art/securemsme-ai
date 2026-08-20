-- Enforce website and monitoring target entitlements at the database boundary.
-- Existing rows are intentionally left untouched; this blocks future bypasses.

create or replace function public.enforce_website_plan_resource_limits_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan text := 'free';
  v_website_limit integer := 1;
  v_monitoring_limit integer := 1;
  v_current_count integer := 0;
begin
  -- Trusted service-role maintenance is not customer entitlement traffic.
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Serialize entitlement-sensitive changes for the same account.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  select case
    when p.plan in ('starter', 'growth', 'agency')
      and (p.plan_expires_at is null or p.plan_expires_at > now())
      then p.plan
    else 'free'
  end
  into v_plan
  from public.profiles p
  where p.id = new.user_id;

  v_plan := coalesce(v_plan, 'free');
  v_website_limit := case v_plan
    when 'growth' then 5
    when 'agency' then 25
    else 1
  end;
  v_monitoring_limit := v_website_limit;

  if tg_op = 'INSERT' then
    select count(*)
    into v_current_count
    from public.websites w
    where w.user_id = new.user_id;

    if v_current_count >= v_website_limit then
      raise exception 'WEBSITE_PLAN_LIMIT_REACHED plan=% limit=%', v_plan, v_website_limit
        using errcode = 'P0001';
    end if;

    if coalesce(new.monitoring_enabled, false) then
      select count(*)
      into v_current_count
      from public.websites w
      where w.user_id = new.user_id
        and w.monitoring_enabled = true;

      if v_current_count >= v_monitoring_limit then
        raise exception 'MONITORING_PLAN_LIMIT_REACHED plan=% limit=%', v_plan, v_monitoring_limit
          using errcode = 'P0001';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE'
    and coalesce(old.monitoring_enabled, false) = false
    and coalesce(new.monitoring_enabled, false) = true then
    select count(*)
    into v_current_count
    from public.websites w
    where w.user_id = new.user_id
      and w.monitoring_enabled = true
      and w.id <> new.id;

    if v_current_count >= v_monitoring_limit then
      raise exception 'MONITORING_PLAN_LIMIT_REACHED plan=% limit=%', v_plan, v_monitoring_limit
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists websites_enforce_plan_limit_v1 on public.websites;
create trigger websites_enforce_plan_limit_v1
before insert on public.websites
for each row
execute function public.enforce_website_plan_resource_limits_v1();

drop trigger if exists websites_enforce_monitoring_limit_v1 on public.websites;
create trigger websites_enforce_monitoring_limit_v1
before update of monitoring_enabled on public.websites
for each row
when (
  coalesce(old.monitoring_enabled, false) = false
  and coalesce(new.monitoring_enabled, false) = true
)
execute function public.enforce_website_plan_resource_limits_v1();
