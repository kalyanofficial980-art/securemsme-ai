begin;

create index if not exists admin_operations_audit_admin_idx
  on public.admin_operations_audit_v2 (admin_user_id, created_at desc);
create index if not exists manual_payment_events_admin_idx
  on public.manual_payment_admin_events_v2 (admin_user_id, created_at desc);
create index if not exists manual_payment_approved_by_idx
  on public.manual_payment_requests_v2 (approved_by);
create index if not exists manual_payment_billing_profile_idx
  on public.manual_payment_requests_v2 (billing_profile_id);
create index if not exists support_requests_assigned_idx
  on public.support_requests_v2 (assigned_to, updated_at desc);
create index if not exists support_requests_user_idx
  on public.support_requests_v2 (user_id, created_at desc);

drop policy if exists "billing profile own select" on public.user_billing_profiles_v2;
create policy "billing profile own select"
on public.user_billing_profiles_v2 for select to authenticated
using (user_id = (select auth.uid()) or (select public.current_user_is_admin()));

drop policy if exists "billing profile free self insert" on public.user_billing_profiles_v2;
create policy "billing profile free self insert"
on public.user_billing_profiles_v2 for insert to authenticated
with check (user_id = (select auth.uid()) and plan_key = 'free' and billing_status = 'active');

drop policy if exists "manual payment own select" on public.manual_payment_requests_v2;
create policy "manual payment own select"
on public.manual_payment_requests_v2 for select to authenticated
using (user_id = (select auth.uid()) or (select public.current_user_is_admin()));

drop policy if exists "manual payment own submit" on public.manual_payment_requests_v2;
create policy "manual payment own submit"
on public.manual_payment_requests_v2 for insert to authenticated
with check (
  user_id = (select auth.uid())
  and requested_plan_key in ('starter','growth','agency')
  and request_status in ('pending_payment','submitted_for_review')
  and approved_by is null
  and approved_at is null
  and plan_activated_at is null
  and plan_expires_at is null
);

drop policy if exists "payment events own select" on public.manual_payment_admin_events_v2;
create policy "payment events own select"
on public.manual_payment_admin_events_v2 for select to authenticated
using (user_id = (select auth.uid()) or (select public.current_user_is_admin()));

drop policy if exists "payment submitted event self insert" on public.manual_payment_admin_events_v2;
create policy "payment submitted event self insert"
on public.manual_payment_admin_events_v2 for insert to authenticated
with check (
  user_id = (select auth.uid())
  and admin_user_id is null
  and event_type = 'payment-submitted'
);

drop policy if exists "support submit" on public.support_requests_v2;
create policy "support submit"
on public.support_requests_v2 for insert to anon, authenticated
with check (((select auth.uid()) is null and user_id is null) or user_id = (select auth.uid()));

drop policy if exists "support own select" on public.support_requests_v2;
create policy "support own select"
on public.support_requests_v2 for select to authenticated
using (user_id = (select auth.uid()) or (select public.current_user_is_admin()));

commit;
