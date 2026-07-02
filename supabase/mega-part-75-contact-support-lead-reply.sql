-- Mega Part 75: Contact Support + Lead Reply Workflow
-- Support inbox and demo lead reply workflow.
-- No sensitive data collection, no automatic spam, no guaranteed response-time claim.

create extension if not exists pgcrypto;

create table if not exists public.support_contact_tickets_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  demo_request_id uuid references public.public_demo_requests_v2(id) on delete set null,
  full_name text not null default '',
  email text not null default '',
  company_name text not null default '',
  website_url text not null default '',
  topic text not null default 'general'
    check (topic in ('general','demo','pricing','billing','technical-support','security-report','agency','legal','abuse-report')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent-review')),
  message text not null default '',
  ticket_status text not null default 'new'
    check (ticket_status in ('new','triaged','reply-drafted','waiting-customer','resolved','closed','spam-review')),
  support_score integer not null default 0 check (support_score >= 0 and support_score <= 100),
  consent_to_contact boolean not null default false,
  no_sensitive_data_confirmed boolean not null default false,
  client_safe_summary text not null default '',
  admin_notes text not null default '',
  ticket_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_reply_drafts_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  demo_request_id uuid references public.public_demo_requests_v2(id) on delete set null,
  support_ticket_id uuid references public.support_contact_tickets_v2(id) on delete set null,
  reply_type text not null default 'support'
    check (reply_type in ('demo-follow-up','pricing-follow-up','support','billing','technical-support','security-report','agency','legal')),
  to_email text not null default '',
  subject text not null default '',
  body text not null default '',
  reply_status text not null default 'draft'
    check (reply_status in ('draft','approved','queued','sent-manual','archived')),
  safety_status text not null default 'safe-draft'
    check (safety_status in ('safe-draft','needs-review','blocked')),
  safety_notes text not null default '',
  reply_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_email_queue_v2 (
  id uuid primary key default gen_random_uuid(),
  reply_draft_id uuid references public.lead_reply_drafts_v2(id) on delete set null,
  support_ticket_id uuid references public.support_contact_tickets_v2(id) on delete set null,
  demo_request_id uuid references public.public_demo_requests_v2(id) on delete set null,
  queue_type text not null default 'support-reply'
    check (queue_type in ('support-reply','demo-follow-up','pricing-follow-up','billing-follow-up','admin-notification')),
  to_email text not null default '',
  subject text not null default '',
  body_preview text not null default '',
  queue_status text not null default 'queued'
    check (queue_status in ('queued','ready-for-manual-send','sent-manual','failed','cancelled')),
  provider text not null default 'manual'
    check (provider in ('manual','resend-pending','smtp-pending')),
  provider_message_id text not null default '',
  queued_by uuid references auth.users(id) on delete set null,
  queued_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_contact_events_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  support_ticket_id uuid references public.support_contact_tickets_v2(id) on delete cascade,
  reply_draft_id uuid references public.lead_reply_drafts_v2(id) on delete set null,
  demo_request_id uuid references public.public_demo_requests_v2(id) on delete set null,
  event_type text not null default 'support-event'
    check (event_type in ('ticket-created','ticket-updated','reply-drafted','reply-queued','manual-send-marked','support-event')),
  severity text not null default 'Info'
    check (severity in ('Critical','High','Medium','Low','Info')),
  title text not null,
  details text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_contact_tickets_v2_created_idx on public.support_contact_tickets_v2(created_at desc);
create index if not exists support_contact_tickets_v2_status_idx on public.support_contact_tickets_v2(ticket_status, created_at desc);
create index if not exists lead_reply_drafts_v2_created_idx on public.lead_reply_drafts_v2(created_at desc);
create index if not exists support_email_queue_v2_status_idx on public.support_email_queue_v2(queue_status, created_at desc);
create index if not exists support_contact_events_v2_created_idx on public.support_contact_events_v2(created_at desc);

alter table public.support_contact_tickets_v2 enable row level security;
alter table public.lead_reply_drafts_v2 enable row level security;
alter table public.support_email_queue_v2 enable row level security;
alter table public.support_contact_events_v2 enable row level security;

drop policy if exists "Anyone can create support tickets v2" on public.support_contact_tickets_v2;
create policy "Anyone can create support tickets v2" on public.support_contact_tickets_v2
for insert to anon, authenticated
with check (consent_to_contact = true and no_sensitive_data_confirmed = true);

drop policy if exists "Users can read own support tickets v2" on public.support_contact_tickets_v2;
create policy "Users can read own support tickets v2" on public.support_contact_tickets_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can update support tickets v2" on public.support_contact_tickets_v2;
create policy "Admins can update support tickets v2" on public.support_contact_tickets_v2
for update to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can manage lead replies v2" on public.lead_reply_drafts_v2;
create policy "Admins can manage lead replies v2" on public.lead_reply_drafts_v2
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can manage support email queue v2" on public.support_email_queue_v2;
create policy "Admins can manage support email queue v2" on public.support_email_queue_v2
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Anyone can create support events v2" on public.support_contact_events_v2;
create policy "Anyone can create support events v2" on public.support_contact_events_v2
for insert to anon, authenticated
with check (true);

drop policy if exists "Admins can read support events v2" on public.support_contact_events_v2;
create policy "Admins can read support events v2" on public.support_contact_events_v2
for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_support_contact_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_support_contact_tickets_v2_updated_at on public.support_contact_tickets_v2;
create trigger touch_support_contact_tickets_v2_updated_at
before update on public.support_contact_tickets_v2
for each row execute function public.touch_support_contact_v2_updated_at();

drop trigger if exists touch_lead_reply_drafts_v2_updated_at on public.lead_reply_drafts_v2;
create trigger touch_lead_reply_drafts_v2_updated_at
before update on public.lead_reply_drafts_v2
for each row execute function public.touch_support_contact_v2_updated_at();

drop trigger if exists touch_support_email_queue_v2_updated_at on public.support_email_queue_v2;
create trigger touch_support_email_queue_v2_updated_at
before update on public.support_email_queue_v2
for each row execute function public.touch_support_contact_v2_updated_at();
