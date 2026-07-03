-- Mega Part 48: Alerts + Email Notification Foundation

create extension if not exists pgcrypto;

create table if not exists public.alert_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,
  website_url text not null,

  status text not null default 'active' check (status in ('active', 'paused', 'disabled')),
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  recipient_email text,
  min_severity text not null default 'Medium' check (min_severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  alert_types jsonb not null default '["score-drop", "risk-increase", "regression"]'::jsonb,
  quiet_hours jsonb not null default '{}'::jsonb,
  policy jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.security_alert_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid references public.websites(id) on delete cascade,
  source_scan_id uuid references public.scans(id) on delete set null,
  monitoring_event_id uuid references public.monitoring_events(id) on delete set null,
  alert_preference_id uuid references public.alert_preferences(id) on delete set null,

  website_url text not null,
  channel text not null default 'in-app' check (channel in ('in-app', 'email')),
  recipient text,
  alert_type text not null,
  severity text not null default 'Info' check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  message text not null,
  action_url text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'cancelled', 'read')),
  delivery_mode text not null default 'development-simulated' check (delivery_mode in ('development-simulated', 'provider-ready')),
  payload jsonb not null default '{}'::jsonb,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.security_alert_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.security_alert_notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null default 'email' check (channel in ('in-app', 'email')),
  provider text not null default 'development-simulated',
  attempt_number integer not null default 1,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists alert_preferences_user_id_idx on public.alert_preferences(user_id);
create index if not exists alert_preferences_website_id_idx on public.alert_preferences(website_id);
create index if not exists alert_preferences_status_idx on public.alert_preferences(status);

create index if not exists security_alert_notifications_user_id_idx on public.security_alert_notifications(user_id);
create index if not exists security_alert_notifications_website_id_idx on public.security_alert_notifications(website_id);
create index if not exists security_alert_notifications_scan_id_idx on public.security_alert_notifications(source_scan_id);
create index if not exists security_alert_notifications_event_id_idx on public.security_alert_notifications(monitoring_event_id);
create index if not exists security_alert_notifications_status_idx on public.security_alert_notifications(status);
create index if not exists security_alert_notifications_severity_idx on public.security_alert_notifications(severity);
create index if not exists security_alert_notifications_created_at_idx on public.security_alert_notifications(created_at desc);

create index if not exists security_alert_delivery_attempts_notification_id_idx on public.security_alert_delivery_attempts(notification_id);
create index if not exists security_alert_delivery_attempts_user_id_idx on public.security_alert_delivery_attempts(user_id);

alter table public.alert_preferences enable row level security;
alter table public.security_alert_notifications enable row level security;
alter table public.security_alert_delivery_attempts enable row level security;

drop policy if exists "Users and admins can read alert preferences" on public.alert_preferences;
create policy "Users and admins can read alert preferences"
on public.alert_preferences
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own alert preferences" on public.alert_preferences;
create policy "Users can insert own alert preferences"
on public.alert_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own alert preferences" on public.alert_preferences;
create policy "Users can update own alert preferences"
on public.alert_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read alert notifications" on public.security_alert_notifications;
create policy "Users and admins can read alert notifications"
on public.security_alert_notifications
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own alert notifications" on public.security_alert_notifications;
create policy "Users can insert own alert notifications"
on public.security_alert_notifications
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own alert notifications" on public.security_alert_notifications;
create policy "Users can update own alert notifications"
on public.security_alert_notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users and admins can read alert attempts" on public.security_alert_delivery_attempts;
create policy "Users and admins can read alert attempts"
on public.security_alert_delivery_attempts
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

drop policy if exists "Users can insert own alert attempts" on public.security_alert_delivery_attempts;
create policy "Users can insert own alert attempts"
on public.security_alert_delivery_attempts
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.set_alert_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_alert_preferences_updated_at on public.alert_preferences;
create trigger set_alert_preferences_updated_at
before update on public.alert_preferences
for each row
execute function public.set_alert_preferences_updated_at();
