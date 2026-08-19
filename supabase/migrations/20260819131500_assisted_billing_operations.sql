begin;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

create table if not exists public.user_billing_profiles_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_key text not null default 'free' check (plan_key in ('free','starter','growth','agency')),
  billing_status text not null default 'active' check (billing_status in ('active','pending','past_due','cancelled','expired')),
  billing_cycle text check (billing_cycle is null or billing_cycle in ('monthly','yearly')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  payment_provider text not null default 'manual',
  billing_summary text,
  limit_summary text,
  blocked_claims jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.manual_payment_requests_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  billing_profile_id uuid references public.user_billing_profiles_v2(id) on delete set null,
  requested_plan_key text not null check (requested_plan_key in ('starter','growth','agency')),
  requested_plan_name text not null,
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','yearly')),
  amount_inr integer not null check (amount_inr > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  payment_method text not null default 'upi',
  payment_reference text not null,
  payer_name text not null,
  payer_email text not null,
  payer_phone text,
  payment_note text,
  request_status text not null default 'submitted_for_review' check (request_status in ('pending_payment','submitted_for_review','approved','rejected','expired')),
  payment_instructions text,
  blocked_claims jsonb not null default '[]'::jsonb,
  request_payload jsonb not null default '{}'::jsonb,
  admin_review_note text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejected_at timestamptz,
  plan_activated_at timestamptz,
  plan_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists manual_payment_reference_uidx
  on public.manual_payment_requests_v2 (lower(payment_reference));
create index if not exists manual_payment_user_created_idx
  on public.manual_payment_requests_v2 (user_id, created_at desc);
create index if not exists manual_payment_status_created_idx
  on public.manual_payment_requests_v2 (request_status, created_at desc);

create table if not exists public.manual_payment_admin_events_v2 (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid references public.manual_payment_requests_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  admin_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_status text not null,
  title text not null,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists manual_payment_events_request_idx
  on public.manual_payment_admin_events_v2 (payment_request_id, created_at desc);
create index if not exists manual_payment_events_user_idx
  on public.manual_payment_admin_events_v2 (user_id, created_at desc);

create table if not exists public.support_requests_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  subject text not null,
  request_type text not null default 'support',
  priority text not null default 'Medium',
  request_status text not null default 'open' check (request_status in ('open','in_progress','resolved','closed')),
  contact_email text not null,
  message text not null,
  admin_note text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.user_billing_profiles_v2 enable row level security;
alter table public.manual_payment_requests_v2 enable row level security;
alter table public.manual_payment_admin_events_v2 enable row level security;
alter table public.support_requests_v2 enable row level security;

grant select, insert on public.user_billing_profiles_v2 to authenticated;
grant select, insert on public.manual_payment_requests_v2 to authenticated;
grant select, insert on public.manual_payment_admin_events_v2 to authenticated;
grant select, insert on public.support_requests_v2 to anon, authenticated;

create policy "billing profile own select"
on public.user_billing_profiles_v2 for select to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

create policy "billing profile free self insert"
on public.user_billing_profiles_v2 for insert to authenticated
with check (user_id = auth.uid() and plan_key = 'free' and billing_status = 'active');

create policy "manual payment own select"
on public.manual_payment_requests_v2 for select to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

create policy "manual payment own submit"
on public.manual_payment_requests_v2 for insert to authenticated
with check (
  user_id = auth.uid()
  and requested_plan_key in ('starter','growth','agency')
  and request_status in ('pending_payment','submitted_for_review')
  and approved_by is null
  and approved_at is null
  and plan_activated_at is null
  and plan_expires_at is null
);

create policy "payment events own select"
on public.manual_payment_admin_events_v2 for select to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

create policy "payment submitted event self insert"
on public.manual_payment_admin_events_v2 for insert to authenticated
with check (
  user_id = auth.uid()
  and admin_user_id is null
  and event_type = 'payment-submitted'
);

create policy "support submit"
on public.support_requests_v2 for insert to anon, authenticated
with check ((auth.uid() is null and user_id is null) or user_id = auth.uid());

create policy "support own select"
on public.support_requests_v2 for select to authenticated
using (user_id = auth.uid() or public.current_user_is_admin());

revoke update (role, plan, plan_expires_at) on public.profiles from anon, authenticated;

create or replace function public.prevent_profile_privilege_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.current_user_is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.plan is distinct from old.plan
     or new.plan_expires_at is distinct from old.plan_expires_at then
    raise exception 'Profile privilege and billing fields cannot be changed from client context.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_self_update on public.profiles;
create trigger prevent_profile_privilege_self_update
before update on public.profiles
for each row execute function public.prevent_profile_privilege_self_update();

create or replace function public.admin_review_manual_payment_v2(
  p_request_id uuid,
  p_decision text,
  p_admin_note text default null
)
returns table (
  request_status text,
  customer_user_id uuid,
  activated_plan text,
  plan_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.manual_payment_requests_v2%rowtype;
  v_now timestamptz := now();
  v_expires timestamptz;
  v_approved boolean;
begin
  if not public.current_user_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_decision not in ('approved','rejected') then
    raise exception 'Invalid review decision' using errcode = '22023';
  end if;

  select * into v_payment
  from public.manual_payment_requests_v2
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Payment request not found' using errcode = 'P0002';
  end if;

  if v_payment.request_status in ('approved','rejected','expired') then
    if v_payment.request_status = p_decision then
      return query select v_payment.request_status, v_payment.user_id, v_payment.requested_plan_key, v_payment.plan_expires_at;
      return;
    end if;
    raise exception 'Payment request already finalized' using errcode = '23514';
  end if;

  v_approved := p_decision = 'approved';
  v_expires := case when v_payment.billing_cycle = 'yearly' then v_now + interval '1 year' else v_now + interval '1 month' end;

  update public.manual_payment_requests_v2
  set request_status = case when v_approved then 'approved' else 'rejected' end,
      admin_review_note = nullif(trim(coalesce(p_admin_note,'')),''),
      approved_by = case when v_approved then auth.uid() else null end,
      approved_at = case when v_approved then v_now else null end,
      rejected_at = case when v_approved then null else v_now end,
      plan_activated_at = case when v_approved then v_now else null end,
      plan_expires_at = case when v_approved then v_expires else null end,
      updated_at = v_now
  where id = v_payment.id;

  if v_approved then
    insert into public.user_billing_profiles_v2 (
      user_id, plan_key, billing_status, billing_cycle, current_period_start,
      current_period_end, payment_provider, billing_summary, limit_summary, updated_at
    ) values (
      v_payment.user_id, v_payment.requested_plan_key, 'active', v_payment.billing_cycle,
      v_now, v_expires, 'manual',
      'Manual payment approved for ' || v_payment.requested_plan_name || '.',
      'Paid plan activated by admin approval.', v_now
    )
    on conflict (user_id) do update set
      plan_key = excluded.plan_key,
      billing_status = excluded.billing_status,
      billing_cycle = excluded.billing_cycle,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      payment_provider = excluded.payment_provider,
      billing_summary = excluded.billing_summary,
      limit_summary = excluded.limit_summary,
      updated_at = excluded.updated_at;

    update public.profiles
    set plan = v_payment.requested_plan_key,
        plan_expires_at = v_expires,
        updated_at = v_now
    where id = v_payment.user_id;
  end if;

  insert into public.manual_payment_admin_events_v2 (
    payment_request_id, user_id, admin_user_id, event_type, event_status, title, details, metadata
  ) values (
    v_payment.id,
    v_payment.user_id,
    auth.uid(),
    case when v_approved then 'payment-approved' else 'payment-rejected' end,
    case when v_approved then 'success' else 'blocked' end,
    case when v_approved then 'Manual payment approved' else 'Manual payment rejected' end,
    coalesce(nullif(trim(coalesce(p_admin_note,'')),''), case when v_approved then 'Plan activated manually.' else 'Payment request rejected.' end),
    jsonb_build_object('planKey', v_payment.requested_plan_key, 'billingCycle', v_payment.billing_cycle)
  );

  return query select
    case when v_approved then 'approved'::text else 'rejected'::text end,
    v_payment.user_id,
    case when v_approved then v_payment.requested_plan_key else null end,
    case when v_approved then v_expires else null end;
end;
$$;

revoke all on function public.admin_review_manual_payment_v2(uuid,text,text) from public;
grant execute on function public.admin_review_manual_payment_v2(uuid,text,text) to authenticated;

commit;
