begin;

create table if not exists public.public_demo_requests_v2 (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  work_email text not null,
  company_name text,
  website_url text,
  country text,
  business_type text,
  team_size text,
  primary_need text,
  requested_plan text not null check (requested_plan in ('starter','growth','agency','enterprise-review')),
  urgency text,
  message text,
  lead_score integer not null default 0 check (lead_score between 0 and 100),
  lead_status text not null default 'new',
  consent_to_contact boolean not null default false,
  no_sensitive_data_confirmed boolean not null default false,
  client_safe_summary text,
  request_payload jsonb not null default '{}'::jsonb,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_demo_status_created_idx
  on public.public_demo_requests_v2 (lead_status, created_at desc);
create index if not exists public_demo_email_idx
  on public.public_demo_requests_v2 (lower(work_email));

create table if not exists public.public_pricing_interests_v2 (
  id uuid primary key default gen_random_uuid(),
  demo_request_id uuid references public.public_demo_requests_v2(id) on delete set null,
  selected_plan text not null check (selected_plan in ('starter','growth','agency','enterprise-review')),
  billing_preference text,
  expected_usage text,
  price_sensitivity text,
  interest_status text not null default 'active',
  pricing_reason text,
  next_best_action text,
  interest_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pricing_interest_demo_idx
  on public.public_pricing_interests_v2 (demo_request_id);
create index if not exists pricing_interest_created_idx
  on public.public_pricing_interests_v2 (created_at desc);

create table if not exists public.public_demo_admin_events_v2 (
  id uuid primary key default gen_random_uuid(),
  demo_request_id uuid references public.public_demo_requests_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  severity text not null default 'Info',
  title text not null,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists public_demo_events_request_idx
  on public.public_demo_admin_events_v2 (demo_request_id, created_at desc);
create index if not exists public_demo_events_user_idx
  on public.public_demo_admin_events_v2 (user_id, created_at desc);

create table if not exists public.public_landing_events_v2 (
  id uuid primary key default gen_random_uuid(),
  demo_request_id uuid references public.public_demo_requests_v2(id) on delete set null,
  event_type text not null,
  source_path text,
  severity text not null default 'Info',
  event_title text not null,
  event_details text,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists public_landing_demo_idx
  on public.public_landing_events_v2 (demo_request_id);
create index if not exists public_landing_created_idx
  on public.public_landing_events_v2 (created_at desc);

alter table public.public_demo_requests_v2 enable row level security;
alter table public.public_pricing_interests_v2 enable row level security;
alter table public.public_demo_admin_events_v2 enable row level security;
alter table public.public_landing_events_v2 enable row level security;

grant insert on public.public_demo_requests_v2 to anon, authenticated;
grant select, update on public.public_demo_requests_v2 to authenticated;
grant insert on public.public_pricing_interests_v2 to anon, authenticated;
grant select on public.public_pricing_interests_v2 to authenticated;
grant insert on public.public_demo_admin_events_v2 to anon, authenticated;
grant select on public.public_demo_admin_events_v2 to authenticated;
grant insert on public.public_landing_events_v2 to anon, authenticated;
grant select on public.public_landing_events_v2 to authenticated;

create policy "public demo submit"
on public.public_demo_requests_v2 for insert to anon, authenticated
with check (consent_to_contact = true and no_sensitive_data_confirmed = true and lead_status = 'new');

create policy "admin demo select"
on public.public_demo_requests_v2 for select to authenticated
using ((select public.current_user_is_admin()));

create policy "admin demo update"
on public.public_demo_requests_v2 for update to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

create policy "public pricing interest insert"
on public.public_pricing_interests_v2 for insert to anon, authenticated
with check (interest_status = 'active');

create policy "admin pricing interest select"
on public.public_pricing_interests_v2 for select to authenticated
using ((select public.current_user_is_admin()));

create policy "public demo event insert"
on public.public_demo_admin_events_v2 for insert to anon, authenticated
with check (
  (event_type = 'request-created' and user_id is null)
  or (select public.current_user_is_admin())
);

create policy "admin demo event select"
on public.public_demo_admin_events_v2 for select to authenticated
using ((select public.current_user_is_admin()));

create policy "public landing event insert"
on public.public_landing_events_v2 for insert to anon, authenticated
with check (event_type in ('demo-request','pricing-interest'));

create policy "admin landing event select"
on public.public_landing_events_v2 for select to authenticated
using ((select public.current_user_is_admin()));

commit;
