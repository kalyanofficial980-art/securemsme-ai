begin;

create table if not exists public.admin_operations_audit_v2 (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid references auth.users(id) on delete set null,
  action_type text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_operations_audit_created_idx
  on public.admin_operations_audit_v2 (created_at desc);
create index if not exists admin_operations_audit_target_idx
  on public.admin_operations_audit_v2 (target_user_id, created_at desc);

alter table public.admin_operations_audit_v2 enable row level security;
grant select on public.admin_operations_audit_v2 to authenticated;

create policy "admin audit select"
on public.admin_operations_audit_v2 for select to authenticated
using (public.current_user_is_admin());

create or replace function public.admin_set_user_plan_v2(
  p_user_id uuid,
  p_plan text,
  p_expires_at timestamptz,
  p_reason text default null
)
returns table (
  user_id uuid,
  previous_plan text,
  new_plan text,
  new_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_old_plan text;
  v_old_expiry timestamptz;
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_plan not in ('free','starter','growth','agency') then
    raise exception 'Invalid plan' using errcode = '22023';
  end if;

  if p_plan <> 'free' and (p_expires_at is null or p_expires_at <= now()) then
    raise exception 'Paid plans require a future expiry date' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User profile not found' using errcode = 'P0002';
  end if;

  v_old_plan := v_profile.plan;
  v_old_expiry := v_profile.plan_expires_at;

  update public.profiles
  set plan = p_plan,
      plan_expires_at = case when p_plan = 'free' then null else p_expires_at end,
      updated_at = now()
  where id = p_user_id;

  insert into public.user_billing_profiles_v2 (
    user_id, plan_key, billing_status, current_period_start, current_period_end,
    payment_provider, billing_summary, limit_summary, updated_at
  ) values (
    p_user_id,
    p_plan,
    'active',
    case when p_plan = 'free' then null else now() end,
    case when p_plan = 'free' then null else p_expires_at end,
    'manual-admin',
    'Plan adjusted by admin control.',
    case when p_plan = 'free' then 'Free limits active.' else 'Paid entitlement adjusted by admin.' end,
    now()
  )
  on conflict (user_id) do update set
    plan_key = excluded.plan_key,
    billing_status = excluded.billing_status,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    payment_provider = excluded.payment_provider,
    billing_summary = excluded.billing_summary,
    limit_summary = excluded.limit_summary,
    updated_at = excluded.updated_at;

  insert into public.admin_operations_audit_v2 (
    admin_user_id, target_user_id, action_type, entity_type, entity_id, summary, metadata
  ) values (
    auth.uid(),
    p_user_id,
    'plan-adjusted',
    'profile',
    p_user_id::text,
    coalesce(nullif(trim(coalesce(p_reason,'')),''), 'Admin plan adjustment'),
    jsonb_build_object(
      'previousPlan', v_old_plan,
      'previousExpiry', v_old_expiry,
      'newPlan', p_plan,
      'newExpiry', case when p_plan = 'free' then null else p_expires_at end
    )
  );

  return query select p_user_id, v_old_plan, p_plan, case when p_plan = 'free' then null else p_expires_at end;
end;
$$;

create or replace function public.admin_update_support_request_v2(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_support public.support_requests_v2%rowtype;
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_status not in ('open','in_progress','resolved','closed') then
    raise exception 'Invalid support status' using errcode = '22023';
  end if;

  select * into v_support
  from public.support_requests_v2
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Support request not found' using errcode = 'P0002';
  end if;

  update public.support_requests_v2
  set request_status = p_status,
      admin_note = nullif(trim(coalesce(p_admin_note,'')),''),
      assigned_to = auth.uid(),
      resolved_at = case when p_status in ('resolved','closed') then now() else null end,
      updated_at = now()
  where id = p_request_id;

  insert into public.admin_operations_audit_v2 (
    admin_user_id, target_user_id, action_type, entity_type, entity_id, summary, metadata
  ) values (
    auth.uid(),
    v_support.user_id,
    'support-status-updated',
    'support_request',
    p_request_id::text,
    coalesce(nullif(trim(coalesce(p_admin_note,'')),''), 'Support request moved to ' || p_status),
    jsonb_build_object('previousStatus', v_support.request_status, 'newStatus', p_status)
  );
end;
$$;

revoke all on function public.admin_set_user_plan_v2(uuid,text,timestamptz,text) from public;
revoke all on function public.admin_update_support_request_v2(uuid,text,text) from public;
grant execute on function public.admin_set_user_plan_v2(uuid,text,timestamptz,text) to authenticated;
grant execute on function public.admin_update_support_request_v2(uuid,text,text) to authenticated;

commit;
