-- Mega Part 76: Final Launch Operations Pack
-- Combined remaining work except custom domain. Domain/DNS tasks are marked "later".
create extension if not exists pgcrypto;

create table if not exists public.launch_email_notification_jobs_v2 (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'manual',
  source_id uuid,
  to_email text not null default '',
  subject text not null default '',
  body_preview text not null default '',
  notification_status text not null default 'draft'
    check (notification_status in ('draft','ready-for-manual-send','sent-manual','cancelled','failed')),
  provider text not null default 'manual',
  safety_status text not null default 'safe-draft'
    check (safety_status in ('safe-draft','needs-review','blocked')),
  created_by uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.launch_abuse_guard_rules_v2 (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  rule_title text not null,
  rule_status text not null default 'active'
    check (rule_status in ('active','monitor-only','disabled')),
  severity text not null default 'Medium'
    check (severity in ('Critical','High','Medium','Low','Info')),
  action_type text not null default 'manual-review'
    check (action_type in ('allow','manual-review','block','rate-limit')),
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.launch_rate_limit_events_v2 (
  id uuid primary key default gen_random_uuid(),
  source_path text not null default '',
  event_type text not null default 'public-form',
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 100),
  decision text not null default 'allow'
    check (decision in ('allow','manual-review','block','rate-limit')),
  reason text not null default '',
  privacy_mode text not null default 'no-cookie',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.launch_beta_customers_v2 (
  id uuid primary key default gen_random_uuid(),
  full_name text not null default '',
  email text not null default '',
  company_name text not null default '',
  website_url text not null default '',
  beta_status text not null default 'invited'
    check (beta_status in ('invited','active','paused','completed','not-fit')),
  beta_plan text not null default 'starter'
    check (beta_plan in ('starter','growth','agency','enterprise-review')),
  onboarding_notes text not null default '',
  feedback_notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.launch_final_checklist_items_v2 (
  id uuid primary key default gen_random_uuid(),
  check_key text not null unique,
  check_title text not null,
  category text not null default 'launch',
  check_status text not null default 'pending'
    check (check_status in ('pending','in-progress','done','blocked','later')),
  priority text not null default 'medium'
    check (priority in ('critical','high','medium','low')),
  owner_note text not null default '',
  evidence_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.launch_crm_exports_v2 (
  id uuid primary key default gen_random_uuid(),
  export_type text not null default 'all',
  export_status text not null default 'generated',
  row_count integer not null default 0,
  generated_by uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.launch_ops_events_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null default 'launch-ops-event',
  severity text not null default 'Info'
    check (severity in ('Critical','High','Medium','Low','Info')),
  title text not null,
  details text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists launch_email_notification_jobs_v2_created_idx on public.launch_email_notification_jobs_v2(created_at desc);
create index if not exists launch_rate_limit_events_v2_created_idx on public.launch_rate_limit_events_v2(created_at desc);
create index if not exists launch_beta_customers_v2_created_idx on public.launch_beta_customers_v2(created_at desc);
create index if not exists launch_final_checklist_items_v2_status_idx on public.launch_final_checklist_items_v2(category, check_status);
create index if not exists launch_ops_events_v2_created_idx on public.launch_ops_events_v2(created_at desc);

alter table public.launch_email_notification_jobs_v2 enable row level security;
alter table public.launch_abuse_guard_rules_v2 enable row level security;
alter table public.launch_rate_limit_events_v2 enable row level security;
alter table public.launch_beta_customers_v2 enable row level security;
alter table public.launch_final_checklist_items_v2 enable row level security;
alter table public.launch_crm_exports_v2 enable row level security;
alter table public.launch_ops_events_v2 enable row level security;

drop policy if exists "Admins manage launch email jobs v2" on public.launch_email_notification_jobs_v2;
create policy "Admins manage launch email jobs v2" on public.launch_email_notification_jobs_v2
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins manage launch guard rules v2" on public.launch_abuse_guard_rules_v2;
create policy "Admins manage launch guard rules v2" on public.launch_abuse_guard_rules_v2
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Anyone can create launch rate events v2" on public.launch_rate_limit_events_v2;
create policy "Anyone can create launch rate events v2" on public.launch_rate_limit_events_v2
for insert to anon, authenticated with check (privacy_mode in ('no-cookie','admin-test','authenticated'));

drop policy if exists "Admins read launch rate events v2" on public.launch_rate_limit_events_v2;
create policy "Admins read launch rate events v2" on public.launch_rate_limit_events_v2
for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins manage beta customers v2" on public.launch_beta_customers_v2;
create policy "Admins manage beta customers v2" on public.launch_beta_customers_v2
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins manage launch checklist v2" on public.launch_final_checklist_items_v2;
create policy "Admins manage launch checklist v2" on public.launch_final_checklist_items_v2
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins manage launch crm exports v2" on public.launch_crm_exports_v2;
create policy "Admins manage launch crm exports v2" on public.launch_crm_exports_v2
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins manage launch ops events v2" on public.launch_ops_events_v2;
create policy "Admins manage launch ops events v2" on public.launch_ops_events_v2
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_launch_ops_updated_at_v2()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_launch_email_notification_jobs_v2_updated_at on public.launch_email_notification_jobs_v2;
create trigger touch_launch_email_notification_jobs_v2_updated_at
before update on public.launch_email_notification_jobs_v2
for each row execute function public.touch_launch_ops_updated_at_v2();

drop trigger if exists touch_launch_beta_customers_v2_updated_at on public.launch_beta_customers_v2;
create trigger touch_launch_beta_customers_v2_updated_at
before update on public.launch_beta_customers_v2
for each row execute function public.touch_launch_ops_updated_at_v2();

drop trigger if exists touch_launch_final_checklist_items_v2_updated_at on public.launch_final_checklist_items_v2;
create trigger touch_launch_final_checklist_items_v2_updated_at
before update on public.launch_final_checklist_items_v2
for each row execute function public.touch_launch_ops_updated_at_v2();

insert into public.launch_abuse_guard_rules_v2(rule_key, rule_title, rule_status, severity, action_type, description)
values
('honeypot-field','Honeypot hidden field check','active','Medium','manual-review','Public forms should use hidden honeypot fields and send suspicious submissions to manual review.'),
('no-sensitive-data','No sensitive data confirmation','active','High','manual-review','Public forms must not collect passwords, OTPs, UPI PINs, card details, private keys or API tokens.'),
('manual-rate-limit','Manual rate-limit monitoring','monitor-only','Medium','rate-limit','Monitor repeated public form events; add provider-level rate limit later.'),
('captcha-later','CAPTCHA provider later','monitor-only','Low','manual-review','Add Turnstile or reCAPTCHA later only if spam appears.')
on conflict (rule_key) do update set
rule_title = excluded.rule_title, rule_status = excluded.rule_status, severity = excluded.severity,
action_type = excluded.action_type, description = excluded.description;

insert into public.launch_final_checklist_items_v2(check_key, check_title, category, check_status, priority, owner_note)
values
('build-pass','Production build passes','product','pending','critical','Run npm.cmd run build before launch push.'),
('e2e-pass','Critical E2E tests pass','product','pending','critical','Run public, support, demo, onboarding and admin E2E tests.'),
('legal-pages','Legal pages reviewed','legal','pending','high','Review Terms, Privacy, Acceptable Use and Disclaimer before paid launch.'),
('manual-billing','Manual billing verified','billing','pending','high','Use manual payment approval until payment gateway is added.'),
('support-inbox','Support inbox verified','support','pending','high','Create ticket, draft reply and mark manual sent.'),
('lead-export','Lead CRM CSV export verified','ops','pending','medium','Download CSV export from Admin Lead CRM.'),
('beta-customer','First beta customer created','beta','pending','high','Add first beta customer and test full workflow.'),
('email-provider','Email provider integration configured','email','later','medium','Keep manual queue now; add provider after domain/email setup.'),
('captcha','CAPTCHA/rate limit provider configured','security','later','medium','Add only if public spam appears.'),
('custom-domain','Custom domain connected','domain-later','later','medium','You said domain will be added later.'),
('email-dns','SPF/DKIM/DMARC configured','domain-later','later','medium','Do after custom domain and email provider.'),
('search-console','Search Console and Bing Webmaster added','seo','later','low','Do after custom domain.')
on conflict (check_key) do update set
check_title = excluded.check_title, category = excluded.category, priority = excluded.priority, owner_note = excluded.owner_note;
