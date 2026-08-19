begin;

create table if not exists public.scan_quota_reservations_v1 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_key text not null check (plan_key in ('free','starter','growth','agency')),
  window_start timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists scan_quota_reservations_user_expiry_idx
  on public.scan_quota_reservations_v1 (user_id, expires_at desc);
create index if not exists scan_quota_reservations_user_created_idx
  on public.scan_quota_reservations_v1 (user_id, created_at desc);

alter table public.scan_quota_reservations_v1 enable row level security;
revoke all on public.scan_quota_reservations_v1 from public, anon, authenticated;

create or replace function public.reserve_scan_quota_v1()
returns table (
  reservation_id uuid,
  effective_plan text,
  scan_limit integer,
  used_slots bigint,
  quota_window_start timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile_plan text;
  v_plan_expires_at timestamptz;
  v_effective_plan text := 'free';
  v_limit integer := 3;
  v_window_start timestamptz;
  v_scan_count bigint := 0;
  v_active_reservations bigint := 0;
  v_recent_scans bigint := 0;
  v_recent_reservations bigint := 0;
  v_burst_limit integer;
  v_reservation_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('scan-quota:' || v_user_id::text, 0));

  select plan, plan_expires_at
    into v_profile_plan, v_plan_expires_at
  from public.profiles
  where id = v_user_id;

  if v_profile_plan in ('starter','growth','agency')
     and (v_plan_expires_at is null or v_plan_expires_at > now()) then
    v_effective_plan := v_profile_plan;
  end if;

  v_limit := case v_effective_plan
    when 'starter' then 20
    when 'growth' then 100
    when 'agency' then 500
    else 3
  end;

  v_window_start := case
    when v_effective_plan = 'free' then date_trunc('day', now())
    else date_trunc('month', now())
  end;

  delete from public.scan_quota_reservations_v1
  where user_id = v_user_id and expires_at <= now();

  select count(*) into v_scan_count
  from public.scans
  where user_id = v_user_id
    and created_at >= v_window_start;

  select count(*) into v_active_reservations
  from public.scan_quota_reservations_v1
  where user_id = v_user_id
    and expires_at > now()
    and window_start = v_window_start;

  if v_scan_count + v_active_reservations >= v_limit then
    raise exception 'Scan limit reached for your current plan.' using errcode = 'P0001';
  end if;

  v_burst_limit := least(10, v_limit);

  select count(*) into v_recent_scans
  from public.scans
  where user_id = v_user_id
    and created_at >= now() - interval '1 minute';

  select count(*) into v_recent_reservations
  from public.scan_quota_reservations_v1
  where user_id = v_user_id
    and expires_at > now()
    and created_at >= now() - interval '1 minute';

  if v_recent_scans + v_recent_reservations >= v_burst_limit then
    raise exception 'Too many scan requests. Please wait and try again.' using errcode = 'P0001';
  end if;

  insert into public.scan_quota_reservations_v1 (
    user_id, plan_key, window_start, expires_at
  ) values (
    v_user_id, v_effective_plan, v_window_start, now() + interval '15 minutes'
  )
  returning id into v_reservation_id;

  return query
  select
    v_reservation_id,
    v_effective_plan,
    v_limit,
    v_scan_count + v_active_reservations + 1,
    v_window_start;
end;
$$;

create or replace function public.release_scan_quota_v1(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.scan_quota_reservations_v1
  where id = p_reservation_id
    and user_id = auth.uid();
end;
$$;

revoke all on function public.reserve_scan_quota_v1() from public, anon;
revoke all on function public.release_scan_quota_v1(uuid) from public, anon;
grant execute on function public.reserve_scan_quota_v1() to authenticated;
grant execute on function public.release_scan_quota_v1(uuid) to authenticated;

create or replace function public.guard_public_demo_submission_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_recent bigint;
begin
  v_email := lower(trim(coalesce(new.work_email, '')));

  if v_email = '' or length(v_email) > 320 then
    raise exception 'Invalid work email.' using errcode = '22023';
  end if;

  if length(trim(coalesce(new.full_name, ''))) > 120
     or length(coalesce(new.company_name, '')) > 200
     or length(coalesce(new.website_url, '')) > 500
     or length(coalesce(new.country, '')) > 100
     or length(coalesce(new.message, '')) > 5000
     or length(coalesce(new.client_safe_summary, '')) > 4000
     or octet_length(coalesce(new.request_payload, '{}'::jsonb)::text) > 12000 then
    raise exception 'Demo request is too large.' using errcode = '22023';
  end if;

  new.work_email := v_email;
  new.full_name := trim(new.full_name);

  if auth.role() = 'service_role' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('demo-rate:' || v_email, 0));

  select count(*) into v_recent
  from public.public_demo_requests_v2
  where lower(work_email) = v_email
    and created_at >= now() - interval '1 hour';

  if v_recent >= 3 then
    raise exception 'Too many demo requests. Please wait and try again.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create or replace function public.guard_public_support_submission_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_recent bigint;
begin
  v_email := lower(trim(coalesce(new.contact_email, '')));

  if v_email = '' or length(v_email) > 320 then
    raise exception 'Invalid contact email.' using errcode = '22023';
  end if;

  if length(trim(coalesce(new.subject, ''))) > 500
     or length(coalesce(new.request_type, '')) > 80
     or length(coalesce(new.priority, '')) > 40
     or length(coalesce(new.message, '')) > 5000
     or length(coalesce(new.admin_note, '')) > 5000 then
    raise exception 'Support request is too large.' using errcode = '22023';
  end if;

  new.contact_email := v_email;
  new.subject := trim(new.subject);

  if auth.role() = 'service_role' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('support-rate:' || v_email, 0));

  select count(*) into v_recent
  from public.support_requests_v2
  where lower(contact_email) = v_email
    and created_at >= now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'Too many support requests. Please wait and try again.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_public_demo_submission_v1() from public, anon, authenticated;
revoke all on function public.guard_public_support_submission_v1() from public, anon, authenticated;

drop trigger if exists guard_public_demo_submission_v1 on public.public_demo_requests_v2;
create trigger guard_public_demo_submission_v1
before insert on public.public_demo_requests_v2
for each row execute function public.guard_public_demo_submission_v1();

drop trigger if exists guard_public_support_submission_v1 on public.support_requests_v2;
create trigger guard_public_support_submission_v1
before insert on public.support_requests_v2
for each row execute function public.guard_public_support_submission_v1();

create unique index if not exists public_pricing_one_per_demo_uidx
  on public.public_pricing_interests_v2 (demo_request_id)
  where demo_request_id is not null;

create unique index if not exists public_demo_created_event_uidx
  on public.public_demo_admin_events_v2 (demo_request_id, event_type)
  where demo_request_id is not null and event_type = 'request-created';

create unique index if not exists public_landing_event_once_uidx
  on public.public_landing_events_v2 (demo_request_id, event_type)
  where demo_request_id is not null;

drop policy if exists "public pricing interest insert" on public.public_pricing_interests_v2;
create policy "public pricing interest insert"
on public.public_pricing_interests_v2 for insert to anon, authenticated
with check (interest_status = 'active' and demo_request_id is not null);

drop policy if exists "public demo event insert" on public.public_demo_admin_events_v2;
create policy "public demo event insert"
on public.public_demo_admin_events_v2 for insert to anon, authenticated
with check (
  (event_type = 'request-created' and user_id is null and demo_request_id is not null)
  or (select public.current_user_is_admin())
);

drop policy if exists "public landing event insert" on public.public_landing_events_v2;
create policy "public landing event insert"
on public.public_landing_events_v2 for insert to anon, authenticated
with check (
  event_type in ('demo-request','pricing-interest')
  and demo_request_id is not null
);

commit;
