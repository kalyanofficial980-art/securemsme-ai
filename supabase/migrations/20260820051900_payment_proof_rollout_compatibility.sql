-- Keep the current production checkout compatible until the screenshot-required
-- application release is promoted. The proof bucket/column/policies from the
-- prior migration remain available to the preview application.

drop policy if exists "manual payment own submit" on public.manual_payment_requests_v2;
create policy "manual payment own submit"
on public.manual_payment_requests_v2
for insert
to authenticated
with check (
  (not public.current_user_is_admin())
  and user_id = (select auth.uid())
  and requested_plan_key = any (array['starter'::text, 'growth'::text, 'agency'::text])
  and requested_plan_name = case requested_plan_key
    when 'starter' then 'Starter'
    when 'growth' then 'Growth'
    when 'agency' then 'Agency'
    else null
  end
  and billing_cycle = 'monthly'
  and amount_inr = case requested_plan_key
    when 'starter' then 999
    when 'growth' then 2499
    when 'agency' then 6999
    else null
  end
  and currency = 'INR'
  and request_status = 'submitted_for_review'
  and approved_by is null
  and approved_at is null
  and plan_activated_at is null
  and plan_expires_at is null
);
