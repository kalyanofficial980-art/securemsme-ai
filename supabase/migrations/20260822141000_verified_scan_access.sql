alter table public.websites
  add column if not exists scan_access_enabled boolean not null default false,
  add column if not exists scan_access_token_hash text,
  add column if not exists scan_access_token_prefix text,
  add column if not exists scan_access_configured_at timestamptz,
  add column if not exists scan_access_last_verified_at timestamptz,
  add column if not exists scan_access_last_status text not null default 'never';

alter table public.websites
  drop constraint if exists websites_scan_access_status_check;
alter table public.websites
  add constraint websites_scan_access_status_check
  check (scan_access_last_status in ('never', 'verified', 'blocked', 'error'));

alter table public.websites
  drop constraint if exists websites_scan_access_hash_check;
alter table public.websites
  add constraint websites_scan_access_hash_check
  check (
    (scan_access_enabled = false)
    or (
      scan_access_token_hash ~ '^[a-f0-9]{64}$'
      and scan_access_token_prefix is not null
      and length(scan_access_token_prefix) between 8 and 24
    )
  );

-- The table previously had table-level SELECT, which would expose every future
-- column automatically. Replace it with an explicit safe-column allowlist so
-- scan_access_token_hash is never readable through the authenticated Data API.
revoke select on public.websites from authenticated;
grant select (
  id,
  user_id,
  business_name,
  website_url,
  industry,
  created_at,
  url,
  name,
  updated_at,
  monitoring_enabled,
  scan_frequency,
  last_scan_at,
  next_scan_at,
  latest_score,
  latest_risk_level,
  latest_scan_id,
  verification_token,
  verification_method,
  verification_status,
  verified_at,
  verified_by,
  permission_attested_at,
  deep_scan_enabled,
  scan_access_enabled,
  scan_access_token_prefix,
  scan_access_configured_at,
  scan_access_last_verified_at,
  scan_access_last_status
) on public.websites to authenticated;

create or replace function public.configure_scan_access_v1(
  p_website_id uuid,
  p_token_hash text,
  p_token_prefix text
)
returns table (
  enabled boolean,
  token_prefix text,
  configured_at timestamptz,
  last_verified_at timestamptz,
  last_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = v_uid and role = 'admin') then
    raise exception 'Customer Scan Access is unavailable for admin accounts' using errcode = '42501';
  end if;

  if p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid Scan Access token hash';
  end if;

  if p_token_prefix is null or length(p_token_prefix) < 8 or length(p_token_prefix) > 24 then
    raise exception 'Invalid Scan Access token prefix';
  end if;

  update public.websites
  set scan_access_enabled = true,
      scan_access_token_hash = p_token_hash,
      scan_access_token_prefix = p_token_prefix,
      scan_access_configured_at = v_now,
      scan_access_last_verified_at = null,
      scan_access_last_status = 'never',
      updated_at = v_now
  where id = p_website_id
    and user_id = v_uid;

  if not found then
    raise exception 'Website not found' using errcode = '42501';
  end if;

  return query
  select w.scan_access_enabled,
         w.scan_access_token_prefix,
         w.scan_access_configured_at,
         w.scan_access_last_verified_at,
         w.scan_access_last_status
  from public.websites w
  where w.id = p_website_id and w.user_id = v_uid;
end;
$$;

create or replace function public.verify_scan_access_token_v1(
  p_website_id uuid,
  p_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_match boolean := false;
begin
  if v_uid is null then
    return false;
  end if;

  if p_token_hash !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  select exists (
    select 1
    from public.websites w
    where w.id = p_website_id
      and w.user_id = v_uid
      and w.scan_access_enabled = true
      and w.scan_access_token_hash = p_token_hash
  ) into v_match;

  return v_match;
end;
$$;

create or replace function public.record_scan_access_test_v1(
  p_website_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_status not in ('verified', 'blocked', 'error') then
    raise exception 'Invalid Scan Access test status';
  end if;

  update public.websites
  set scan_access_last_status = p_status,
      scan_access_last_verified_at = case when p_status = 'verified' then v_now else scan_access_last_verified_at end,
      updated_at = v_now
  where id = p_website_id
    and user_id = v_uid
    and scan_access_enabled = true;

  if not found then
    raise exception 'Website not found or Scan Access is disabled' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.revoke_scan_access_v1(p_website_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.websites
  set scan_access_enabled = false,
      scan_access_token_hash = null,
      scan_access_token_prefix = null,
      scan_access_configured_at = null,
      scan_access_last_verified_at = null,
      scan_access_last_status = 'never',
      updated_at = now()
  where id = p_website_id
    and user_id = v_uid;

  if not found then
    raise exception 'Website not found' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.configure_scan_access_v1(uuid, text, text) from public, anon;
revoke all on function public.verify_scan_access_token_v1(uuid, text) from public, anon;
revoke all on function public.record_scan_access_test_v1(uuid, text) from public, anon;
revoke all on function public.revoke_scan_access_v1(uuid) from public, anon;

grant execute on function public.configure_scan_access_v1(uuid, text, text) to authenticated;
grant execute on function public.verify_scan_access_token_v1(uuid, text) to authenticated;
grant execute on function public.record_scan_access_test_v1(uuid, text) to authenticated;
grant execute on function public.revoke_scan_access_v1(uuid) to authenticated;
