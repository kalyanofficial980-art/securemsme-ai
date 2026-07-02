-- Mega Part 74: SEO + Sitemap + Launch Analytics
-- Privacy-safe launch analytics foundation.
-- No cookies, no fingerprinting, no invasive tracking.

create extension if not exists pgcrypto;

create table if not exists public.launch_seo_pages_v2 (
  id uuid primary key default gen_random_uuid(),

  path text not null unique,
  page_title text not null,
  meta_description text not null,
  canonical_url text not null default '',
  page_type text not null default 'marketing'
    check (page_type in ('marketing', 'pricing', 'demo', 'legal', 'trust', 'onboarding', 'app', 'admin')),
  indexable boolean not null default true,
  priority numeric(2,1) not null default 0.5 check (priority >= 0 and priority <= 1),
  change_frequency text not null default 'weekly'
    check (change_frequency in ('always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never')),
  seo_status text not null default 'active'
    check (seo_status in ('active', 'draft', 'noindex', 'archived')),
  blocked_claims jsonb not null default '[]'::jsonb,
  seo_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.launch_analytics_events_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,

  event_type text not null default 'page-view'
    check (event_type in ('page-view', 'cta-click', 'pricing-interest', 'demo-request', 'onboarding-click', 'manual-billing-click', 'seo-readiness-view', 'launch-event')),
  source_path text not null default '',
  target_path text not null default '',
  campaign_source text not null default '',
  campaign_medium text not null default '',
  campaign_name text not null default '',
  referrer_safe text not null default '',
  device_hint text not null default 'unknown'
    check (device_hint in ('desktop', 'mobile', 'tablet', 'bot-or-preview', 'unknown')),
  country_hint text not null default '',
  event_status text not null default 'accepted'
    check (event_status in ('accepted', 'ignored', 'spam-review')),
  privacy_mode text not null default 'no-cookie'
    check (privacy_mode in ('no-cookie', 'authenticated', 'admin-test')),
  client_safe_summary text not null default '',
  event_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.launch_analytics_daily_v2 (
  id uuid primary key default gen_random_uuid(),

  analytics_date date not null default current_date,
  source_path text not null default '',
  event_type text not null default 'page-view',
  total_events integer not null default 0 check (total_events >= 0),
  demo_requests integer not null default 0 check (demo_requests >= 0),
  pricing_interests integer not null default 0 check (pricing_interests >= 0),
  onboarding_clicks integer not null default 0 check (onboarding_clicks >= 0),
  top_campaign_source text not null default '',
  daily_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(analytics_date, source_path, event_type)
);

create table if not exists public.launch_seo_checks_v2 (
  id uuid primary key default gen_random_uuid(),
  seo_page_id uuid references public.launch_seo_pages_v2(id) on delete cascade,

  check_key text not null,
  check_title text not null,
  check_status text not null default 'manual-review'
    check (check_status in ('pass', 'warning', 'fail', 'manual-review', 'not-applicable')),
  severity text not null default 'Medium'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  evidence_summary text not null default '',
  remediation_action text not null default '',
  check_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.launch_seo_admin_events_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  seo_page_id uuid references public.launch_seo_pages_v2(id) on delete set null,

  event_type text not null default 'seo-event'
    check (event_type in ('seo-page-created', 'seo-check-created', 'analytics-event', 'daily-rollup', 'seo-event')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null default '',
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists launch_seo_pages_v2_path_idx on public.launch_seo_pages_v2(path);
create index if not exists launch_analytics_events_v2_created_idx on public.launch_analytics_events_v2(created_at desc);
create index if not exists launch_analytics_events_v2_path_idx on public.launch_analytics_events_v2(source_path, created_at desc);
create index if not exists launch_analytics_daily_v2_date_idx on public.launch_analytics_daily_v2(analytics_date desc);
create index if not exists launch_seo_checks_v2_page_idx on public.launch_seo_checks_v2(seo_page_id);
create index if not exists launch_seo_admin_events_v2_created_idx on public.launch_seo_admin_events_v2(created_at desc);

alter table public.launch_seo_pages_v2 enable row level security;
alter table public.launch_analytics_events_v2 enable row level security;
alter table public.launch_analytics_daily_v2 enable row level security;
alter table public.launch_seo_checks_v2 enable row level security;
alter table public.launch_seo_admin_events_v2 enable row level security;

drop policy if exists "Anyone can read active SEO pages v2" on public.launch_seo_pages_v2;
create policy "Anyone can read active SEO pages v2" on public.launch_seo_pages_v2
for select to anon, authenticated
using (seo_status = 'active' and indexable = true);

drop policy if exists "Admins can manage SEO pages v2" on public.launch_seo_pages_v2;
create policy "Admins can manage SEO pages v2" on public.launch_seo_pages_v2
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Anyone can create launch analytics events v2" on public.launch_analytics_events_v2;
create policy "Anyone can create launch analytics events v2" on public.launch_analytics_events_v2
for insert to anon, authenticated
with check (privacy_mode in ('no-cookie', 'authenticated', 'admin-test'));

drop policy if exists "Admins can read launch analytics events v2" on public.launch_analytics_events_v2;
create policy "Admins can read launch analytics events v2" on public.launch_analytics_events_v2
for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can manage launch analytics daily v2" on public.launch_analytics_daily_v2;
create policy "Admins can manage launch analytics daily v2" on public.launch_analytics_daily_v2
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Anyone can read active SEO checks v2" on public.launch_seo_checks_v2;
create policy "Anyone can read active SEO checks v2" on public.launch_seo_checks_v2
for select to anon, authenticated
using (true);

drop policy if exists "Admins can manage SEO checks v2" on public.launch_seo_checks_v2;
create policy "Admins can manage SEO checks v2" on public.launch_seo_checks_v2
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can read SEO admin events v2" on public.launch_seo_admin_events_v2;
create policy "Admins can read SEO admin events v2" on public.launch_seo_admin_events_v2
for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Anyone can create SEO admin events v2" on public.launch_seo_admin_events_v2;
create policy "Anyone can create SEO admin events v2" on public.launch_seo_admin_events_v2
for insert to anon, authenticated
with check (true);

create or replace function public.touch_launch_seo_pages_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_launch_seo_pages_v2_updated_at on public.launch_seo_pages_v2;
create trigger touch_launch_seo_pages_v2_updated_at
before update on public.launch_seo_pages_v2
for each row execute function public.touch_launch_seo_pages_v2_updated_at();

create or replace function public.touch_launch_analytics_daily_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_launch_analytics_daily_v2_updated_at on public.launch_analytics_daily_v2;
create trigger touch_launch_analytics_daily_v2_updated_at
before update on public.launch_analytics_daily_v2
for each row execute function public.touch_launch_analytics_daily_v2_updated_at();

insert into public.launch_seo_pages_v2
(path, page_title, meta_description, canonical_url, page_type, indexable, priority, change_frequency, seo_status, blocked_claims, seo_payload)
values
('/public-launch', 'SecureMSME AI — AI Security Workflow for MSMEs', 'AI-assisted security workflow for authorized website checks, client-safe reports, developer fixes, repo review, cloud config and scheduled monitoring.', 'https://securemsme-ai-live.vercel.app/public-launch', 'marketing', true, 1.0, 'weekly', 'active', '["No 100% security claim","No all-vulnerabilities-found claim","No compliance certification claim"]'::jsonb, '{"seeded":true}'::jsonb),
('/pricing', 'SecureMSME AI Pricing — Manual Billing Plans', 'View launch pricing options for Starter, Growth, Agency and Enterprise Review. Manual billing only during launch.', 'https://securemsme-ai-live.vercel.app/pricing', 'pricing', true, 0.9, 'weekly', 'active', '["No card collection","No fake guarantee"]'::jsonb, '{"seeded":true}'::jsonb),
('/demo', 'Request SecureMSME AI Demo', 'Request a demo for an authorized website security review workflow. Do not submit passwords, OTPs, API tokens or payment data.', 'https://securemsme-ai-live.vercel.app/demo', 'demo', true, 0.8, 'weekly', 'active', '["No sensitive data collection"]'::jsonb, '{"seeded":true}'::jsonb),
('/trust', 'SecureMSME AI Trust Center', 'Security, legal, responsible disclosure and acceptable use information for SecureMSME AI.', 'https://securemsme-ai-live.vercel.app/trust', 'trust', true, 0.7, 'monthly', 'active', '["Legal templates need review"]'::jsonb, '{"seeded":true}'::jsonb),
('/legal', 'SecureMSME AI Legal Pages', 'Terms, privacy, acceptable use and disclaimer pages for SecureMSME AI.', 'https://securemsme-ai-live.vercel.app/legal', 'legal', true, 0.6, 'monthly', 'active', '["Not legal advice"]'::jsonb, '{"seeded":true}'::jsonb)
on conflict (path) do update set
  page_title = excluded.page_title,
  meta_description = excluded.meta_description,
  canonical_url = excluded.canonical_url,
  page_type = excluded.page_type,
  indexable = excluded.indexable,
  priority = excluded.priority,
  change_frequency = excluded.change_frequency,
  seo_status = excluded.seo_status,
  blocked_claims = excluded.blocked_claims,
  seo_payload = excluded.seo_payload;
