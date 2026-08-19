begin;

drop policy if exists "public demo submit" on public.public_demo_requests_v2;
create policy "public demo submit"
on public.public_demo_requests_v2 for insert to anon, authenticated
with check (
  consent_to_contact = true
  and no_sensitive_data_confirmed = true
  and lead_status in ('new','qualified')
);

commit;
