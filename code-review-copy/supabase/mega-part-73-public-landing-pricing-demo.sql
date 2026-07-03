-- Mega Part 73: Public Landing Page + Pricing + Demo Funnel
-- Public lead capture and pricing interest without collecting card/payment secrets.

create extension if not exists pgcrypto;

create table if not exists public.public_demo_requests_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,

  full_name text not null default '',
  work_email text not null default '',
  company_name text not null default '',
  website_url text not null default '',
  country text not null default 'India',
  business_type text not null default 'msme'
    check (business_type in ('msme', 'startup', 'agency', 'freelancer', 'ngo', 'enterprise', 'other')),
  team_size text not null default '1-5'
    check (team_size in ('1', '1-5', '6-20', '21-50', '51-200', '200+', 'unknown')),
  primary_need text not null default 'first-security-check'
    check (primary_need in ('first-security-check', 'client-report', 'developer-fixes', 'scheduled-monitoring', 'repo-security', 'cloud-config', 'agency-workflow', 'not-sure')),
  requested_plan text not null default 'starter'
    check (requested_plan in ('starter', 'growth', 'agency', 'enterprise-review', 'not-sure')),
  urgency text not null default 'this-month'
    check (urgency in ('today', 'this-week', 'this-month', 'researching')),
  message text not null default '',

  lead_score integer not null default 0 check (lead_score >= 0 and lead_score <= 100),
  lead_status text not null default 'new'
    check (lead_status in ('new', 'qualified', 'contacted', 'demo-booked', 'converted', 'not-fit', 'spam-review')),
  consent_to_contact boolean not null default false,
  no_sensitive_data_confirmed boolean not null default false,
  client_safe_summary text not null default '',
  admin_notes text not null default '',
  request_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_pricing_interests_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  demo_request_id uuid references public.public_demo_requests_v2(id) on delete set null,

  selected_plan text not null
    check (selected_plan in ('starter', 'growth', 'agency', 'enterprise-review')),
  billing_preference text not null default 'manual'
    check (billing_preference in ('manual', 'invoice', 'contact-sales')),
  expected_usage text not null default 'single-website'
    check (expected_usage in ('single-website', 'multiple-websites', 'agency-clients', 'enterprise-review', 'not-sure')),
  price_sensitivity text not null default 'medium'
    check (price_sensitivity in ('low', 'medium', 'high', 'unknown')),
  interest_status text not null default 'active'
    check (interest_status in ('active', 'accepted', 'declined', 'expired')),
  pricing_reason text not null default '',
  next_best_action text not null default '',
  interest_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.public_landing_events_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  demo_request_id uuid references public.public_demo_requests_v2(id) on delete set null,

  event_type text not null default 'landing-event'
    check (event_type in ('landing-view', 'pricing-view', 'demo-request', 'pricing-interest', 'onboarding-click', 'manual-billing-click', 'landing-event')),
  source_path text not null default '',
  campaign_source text not null default '',
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  event_title text not null default '',
  event_details text not null default '',
  event_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.public_demo_admin_events_v2 (
  id uuid primary key default gen_random_uuid(),
  demo_request_id uuid references public.public_demo_requests_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,

  event_type text not null default 'demo-event'
    check (event_type in ('request-created', 'status-updated', 'note-added', 'pricing-interest-created', 'demo-event')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null default '',
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists public_demo_requests_v2_created_idx on public.public_demo_requests_v2(created_at desc);
create index if not exists public_demo_requests_v2_email_idx on public.public_demo_requests_v2(work_email);
create index if not exists public_pricing_interests_v2_created_idx on public.public_pricing_interests_v2(created_at desc);
create index if not exists public_landing_events_v2_created_idx on public.public_landing_events_v2(created_at desc);
create index if not exists public_demo_admin_events_v2_created_idx on public.public_demo_admin_events_v2(created_at desc);

alter table public.public_demo_requests_v2 enable row level security;
alter table public.public_pricing_interests_v2 enable row level security;
alter table public.public_landing_events_v2 enable row level security;
alter table public.public_demo_admin_events_v2 enable row level security;

drop policy if exists "Anyone can create public demo requests v2" on public.public_demo_requests_v2;
create policy "Anyone can create public demo requests v2" on public.public_demo_requests_v2
for insert to anon, authenticated
with check (consent_to_contact = true and no_sensitive_data_confirmed = true);

drop policy if exists "Admins can read public demo requests v2" on public.public_demo_requests_v2;
create policy "Admins can read public demo requests v2" on public.public_demo_requests_v2
for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can update public demo requests v2" on public.public_demo_requests_v2;
create policy "Admins can update public demo requests v2" on public.public_demo_requests_v2
for update to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Anyone can create pricing interests v2" on public.public_pricing_interests_v2;
create policy "Anyone can create pricing interests v2" on public.public_pricing_interests_v2
for insert to anon, authenticated
with check (true);

drop policy if exists "Admins can read pricing interests v2" on public.public_pricing_interests_v2;
create policy "Admins can read pricing interests v2" on public.public_pricing_interests_v2
for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Anyone can create landing events v2" on public.public_landing_events_v2;
create policy "Anyone can create landing events v2" on public.public_landing_events_v2
for insert to anon, authenticated
with check (true);

drop policy if exists "Admins can read landing events v2" on public.public_landing_events_v2;
create policy "Admins can read landing events v2" on public.public_landing_events_v2
for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can read demo admin events v2" on public.public_demo_admin_events_v2;
create policy "Admins can read demo admin events v2" on public.public_demo_admin_events_v2
for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Anyone can create demo admin events v2" on public.public_demo_admin_events_v2;
create policy "Anyone can create demo admin events v2" on public.public_demo_admin_events_v2
for insert to anon, authenticated
with check (true);

create or replace function public.touch_public_demo_requests_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_public_demo_requests_v2_updated_at on public.public_demo_requests_v2;
create trigger touch_public_demo_requests_v2_updated_at
before update on public.public_demo_requests_v2
for each row execute function public.touch_public_demo_requests_v2_updated_at();
