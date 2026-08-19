begin;

drop policy if exists "deny direct scan reservation access" on public.scan_quota_reservations_v1;
create policy "deny direct scan reservation access"
on public.scan_quota_reservations_v1
for all
to anon, authenticated
using (false)
with check (false);

commit;
