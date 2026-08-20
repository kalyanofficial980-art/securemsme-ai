alter table public.manual_payment_requests_v2
  add column if not exists payment_proof_path text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "payment proof own insert" on storage.objects;
create policy "payment proof own insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "payment proof admin select" on storage.objects;
create policy "payment proof admin select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (select public.current_user_is_admin())
);

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
  and payment_proof_path is not null
  and split_part(payment_proof_path, '/', 1) = (select auth.uid()::text)
);
