-- Mega Part 67: Launch Ready Cleanup + Manual Payment Approval + Legal Pages
-- Manual payment approval, legal acceptance, scan authorization and launch trust records.
-- No card data. No payment processor secrets. No 100% security claims.

create extension if not exists pgcrypto;

create table if not exists public.legal_document_versions_v2 (
  id uuid primary key default gen_random_uuid(),
  document_key text not null,
  document_title text not null,
  version text not null default '2026-01',
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  effective_date date not null default current_date,
  summary text not null default '',
  document_url text not null default '',
  requires_acceptance boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_key, version)
);

insert into public.legal_document_versions_v2
(document_key, document_title, version, status, summary, document_url, requires_acceptance)
values
  ('terms', 'Terms and Conditions', '2026-01', 'active', 'Rules for using SecureMSME AI safely and legally.', '/legal/terms', true),
  ('privacy', 'Privacy Policy', '2026-01', 'active', 'How SecureMSME AI handles account, website and report data.', '/legal/privacy', true),
  ('acceptable-use', 'Acceptable Use Policy', '2026-01', 'active', 'Authorized-use-only policy for security scanning.', '/legal/acceptable-use', true),
  ('responsible-disclosure', 'Responsible Disclosure Policy', '2026-01', 'active', 'How security issues related to SecureMSME AI should be reported.', '/legal/responsible-disclosure', false),
  ('refund', 'Refund Policy', '2026-01', 'active', 'Manual payment refund and cancellation rules.', '/legal/refund', true),
  ('data-processing', 'Data Processing Notice', '2026-01', 'active', 'Data handling notice for customer security review data.', '/legal/data-processing', true),
  ('cookie', 'Cookie Policy', '2026-01', 'active', 'How cookies and similar technologies are used.', '/legal/cookie', false),
  ('security-policy', 'Security Policy', '2026-01', 'active', 'Security practices and limitations for the platform.', '/legal/security-policy', false),
  ('disclaimer', 'Disclaimer', '2026-01', 'active', 'Important limits: no 100% security or legal compliance guarantee.', '/legal/disclaimer', true)
on conflict (document_key, version) do update
set document_title = excluded.document_title,
    status = excluded.status,
    summary = excluded.summary,
    document_url = excluded.document_url,
    requires_acceptance = excluded.requires_acceptance,
    updated_at = now();

create table if not exists public.user_legal_acceptances_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null default '2026-01',
  privacy_version text not null default '2026-01',
  acceptable_use_version text not null default '2026-01',
  refund_version text not null default '2026-01',
  data_processing_version text not null default '2026-01',
  disclaimer_version text not null default '2026-01',
  acceptance_status text not null default 'accepted' check (acceptance_status in ('accepted', 'revoked', 'superseded')),
  acceptance_source text not null default 'dashboard' check (acceptance_source in ('signup', 'dashboard', 'billing', 'scan', 'admin')),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, terms_version, privacy_version, acceptable_use_version, refund_version, data_processing_version, disclaimer_version)
);

create table if not exists public.website_scan_authorizations_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,
  target_url text not null,
  authorization_status text not null default 'confirmed' check (authorization_status in ('confirmed', 'revoked', 'expired')),
  authorization_scope text not null default 'safe-public-checks' check (authorization_scope in ('safe-public-checks', 'authenticated-safe-review', 'client-approved-review')),
  owner_confirmation boolean not null default true,
  safe_checks_confirmation boolean not null default true,
  no_unauthorized_testing_confirmation boolean not null default true,
  confirmation_text text not null default '',
  evidence_note text not null default '',
  expires_at timestamptz,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.manual_payment_requests_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  billing_profile_id uuid references public.user_billing_profiles_v2(id) on delete set null,
  requested_plan_key text not null default 'starter',
  requested_plan_name text not null default 'Starter',
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  amount_inr integer not null default 0 check (amount_inr >= 0),
  amount_usd integer not null default 0 check (amount_usd >= 0),
  currency text not null default 'INR' check (currency in ('INR', 'USD')),
  payment_method text not null default 'upi' check (payment_method in ('upi', 'bank-transfer', 'manual-other')),
  payment_reference text not null default '',
  payer_name text not null default '',
  payer_email text not null default '',
  payer_phone text not null default '',
  payment_note text not null default '',
  request_status text not null default 'submitted_for_review' check (request_status in ('pending_payment', 'submitted_for_review', 'approved', 'rejected', 'expired', 'cancelled')),
  admin_review_note text not null default '',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejected_at timestamptz,
  plan_activated_at timestamptz,
  plan_expires_at timestamptz,
  payment_instructions text not null default 'Pay manually using UPI or bank transfer, then submit UTR/reference number for admin approval.',
  blocked_claims jsonb not null default '[]'::jsonb,
  request_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.manual_payment_admin_events_v2 (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid references public.manual_payment_requests_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  admin_user_id uuid references auth.users(id) on delete set null,
  event_type text not null default 'payment-event' check (event_type in ('payment-submitted', 'payment-approved', 'payment-rejected', 'payment-cancelled', 'plan-activated', 'payment-event')),
  event_status text not null default 'info' check (event_status in ('info', 'success', 'warning', 'blocked')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.launch_ready_user_preferences_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  ui_mode text not null default 'launch-simple' check (ui_mode in ('launch-simple', 'developer-advanced', 'agency')),
  show_internal_tools boolean not null default false,
  show_admin_shortcuts boolean not null default false,
  show_agency_tools boolean not null default false,
  launch_packaging_status text not null default 'ready-clean-ui' check (launch_packaging_status in ('ready-clean-ui', 'needs-review', 'advanced-mode')),
  preferences_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_requests_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  subject text not null,
  request_type text not null default 'support' check (request_type in ('support', 'billing', 'security-disclosure', 'legal', 'sales')),
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  request_status text not null default 'open' check (request_status in ('open', 'in-progress', 'resolved', 'closed')),
  contact_email text not null default '',
  message text not null default '',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_document_versions_v2_key_idx on public.legal_document_versions_v2(document_key, status);
create index if not exists user_legal_acceptances_v2_user_id_idx on public.user_legal_acceptances_v2(user_id);
create index if not exists website_scan_authorizations_v2_user_id_idx on public.website_scan_authorizations_v2(user_id);
create index if not exists manual_payment_requests_v2_user_id_idx on public.manual_payment_requests_v2(user_id);
create index if not exists manual_payment_requests_v2_status_idx on public.manual_payment_requests_v2(request_status);
create index if not exists manual_payment_admin_events_v2_created_at_idx on public.manual_payment_admin_events_v2(created_at desc);
create index if not exists support_requests_v2_status_idx on public.support_requests_v2(request_status);

alter table public.legal_document_versions_v2 enable row level security;
alter table public.user_legal_acceptances_v2 enable row level security;
alter table public.website_scan_authorizations_v2 enable row level security;
alter table public.manual_payment_requests_v2 enable row level security;
alter table public.manual_payment_admin_events_v2 enable row level security;
alter table public.launch_ready_user_preferences_v2 enable row level security;
alter table public.support_requests_v2 enable row level security;

drop policy if exists "Anyone can read active legal documents v2" on public.legal_document_versions_v2;
create policy "Anyone can read active legal documents v2" on public.legal_document_versions_v2
for select using (status = 'active' or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own legal acceptances v2" on public.user_legal_acceptances_v2;
create policy "Users can read own legal acceptances v2" on public.user_legal_acceptances_v2
for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own legal acceptances v2" on public.user_legal_acceptances_v2;
create policy "Users can insert own legal acceptances v2" on public.user_legal_acceptances_v2
for insert to authenticated with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own scan authorizations v2" on public.website_scan_authorizations_v2;
create policy "Users can read own scan authorizations v2" on public.website_scan_authorizations_v2
for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own scan authorizations v2" on public.website_scan_authorizations_v2;
create policy "Users can insert own scan authorizations v2" on public.website_scan_authorizations_v2
for insert to authenticated with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own manual payments v2" on public.manual_payment_requests_v2;
create policy "Users can read own manual payments v2" on public.manual_payment_requests_v2
for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own manual payments v2" on public.manual_payment_requests_v2;
create policy "Users can insert own manual payments v2" on public.manual_payment_requests_v2
for insert to authenticated with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can update manual payments v2" on public.manual_payment_requests_v2;
create policy "Admins can update manual payments v2" on public.manual_payment_requests_v2
for update to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own manual payment events v2" on public.manual_payment_admin_events_v2;
create policy "Users can read own manual payment events v2" on public.manual_payment_admin_events_v2
for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own manual payment events v2" on public.manual_payment_admin_events_v2;
create policy "Users can insert own manual payment events v2" on public.manual_payment_admin_events_v2
for insert to authenticated with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own launch prefs v2" on public.launch_ready_user_preferences_v2;
create policy "Users can read own launch prefs v2" on public.launch_ready_user_preferences_v2
for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own launch prefs v2" on public.launch_ready_user_preferences_v2;
create policy "Users can insert own launch prefs v2" on public.launch_ready_user_preferences_v2
for insert to authenticated with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own launch prefs v2" on public.launch_ready_user_preferences_v2;
create policy "Users can update own launch prefs v2" on public.launch_ready_user_preferences_v2
for update to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own support requests v2" on public.support_requests_v2;
create policy "Users can read own support requests v2" on public.support_requests_v2
for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Anyone can create support requests v2" on public.support_requests_v2;
create policy "Anyone can create support requests v2" on public.support_requests_v2
for insert with check (true);

drop policy if exists "Admins can update support requests v2" on public.support_requests_v2;
create policy "Admins can update support requests v2" on public.support_requests_v2
for update to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_launch_ready_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_legal_document_versions_v2_updated_at on public.legal_document_versions_v2;
create trigger touch_legal_document_versions_v2_updated_at before update on public.legal_document_versions_v2
for each row execute function public.touch_launch_ready_v2_updated_at();

drop trigger if exists touch_manual_payment_requests_v2_updated_at on public.manual_payment_requests_v2;
create trigger touch_manual_payment_requests_v2_updated_at before update on public.manual_payment_requests_v2
for each row execute function public.touch_launch_ready_v2_updated_at();

drop trigger if exists touch_launch_ready_user_preferences_v2_updated_at on public.launch_ready_user_preferences_v2;
create trigger touch_launch_ready_user_preferences_v2_updated_at before update on public.launch_ready_user_preferences_v2
for each row execute function public.touch_launch_ready_v2_updated_at();

drop trigger if exists touch_support_requests_v2_updated_at on public.support_requests_v2;
create trigger touch_support_requests_v2_updated_at before update on public.support_requests_v2
for each row execute function public.touch_launch_ready_v2_updated_at();
