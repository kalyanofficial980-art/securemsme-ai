-- Mega Part 68: AI Copilot over Reports
-- Safe report copilot, source-grounded Q&A and admin observability.
-- No exploit payloads, no fake certainty, no 100% security claims.

create extension if not exists pgcrypto;

create table if not exists public.ai_copilot_sessions_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,

  session_title text not null default 'Report Copilot Session',
  session_status text not null default 'active'
    check (session_status in ('active', 'archived', 'closed')),
  copilot_mode text not null default 'report-safe'
    check (copilot_mode in ('report-safe', 'developer-fix', 'executive-summary', 'client-explainer', 'admin-review')),
  target_url text not null default '',
  source_count integer not null default 0,
  message_count integer not null default 0,

  safety_summary text not null default '',
  blocked_claims jsonb not null default '[]'::jsonb,
  session_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_copilot_sources_v2 (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_copilot_sessions_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,

  source_type text not null default 'scan'
    check (source_type in ('scan', 'report', 'finding', 'developer-task', 'monitoring-alert', 'ai-triage', 'manual-context', 'legal-safety')),
  source_ref text not null default '',
  source_title text not null,
  source_summary text not null default '',
  source_confidence text not null default 'Medium'
    check (source_confidence in ('Confirmed', 'High', 'Medium', 'Low', 'Needs manual review')),
  client_safe boolean not null default true,
  source_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.ai_copilot_messages_v2 (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_copilot_sessions_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,

  role text not null check (role in ('user', 'assistant', 'system')),
  message_text text not null,
  safe_answer_type text not null default 'general'
    check (safe_answer_type in ('general', 'executive', 'developer-fix', 'client-explanation', 'priority', 'blocked')),
  confidence_level text not null default 'Medium'
    check (confidence_level in ('High', 'Medium', 'Low', 'Needs manual review')),
  source_ids jsonb not null default '[]'::jsonb,
  blocked_reason text not null default '',
  message_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.ai_copilot_feedback_v2 (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_copilot_sessions_v2(id) on delete cascade,
  message_id uuid references public.ai_copilot_messages_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  feedback_value text not null check (feedback_value in ('helpful', 'not-helpful', 'unsafe', 'needs-review')),
  feedback_note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_copilot_admin_events_v2 (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.ai_copilot_sessions_v2(id) on delete cascade,
  message_id uuid references public.ai_copilot_messages_v2(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,

  event_type text not null default 'copilot-event'
    check (event_type in ('session-created', 'message-created', 'answer-blocked', 'feedback-created', 'copilot-event')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists ai_copilot_sessions_v2_user_id_idx on public.ai_copilot_sessions_v2(user_id);
create index if not exists ai_copilot_sessions_v2_scan_id_idx on public.ai_copilot_sessions_v2(scan_id);
create index if not exists ai_copilot_sources_v2_session_id_idx on public.ai_copilot_sources_v2(session_id);
create index if not exists ai_copilot_messages_v2_session_id_idx on public.ai_copilot_messages_v2(session_id);
create index if not exists ai_copilot_feedback_v2_session_id_idx on public.ai_copilot_feedback_v2(session_id);
create index if not exists ai_copilot_admin_events_v2_created_at_idx on public.ai_copilot_admin_events_v2(created_at desc);

alter table public.ai_copilot_sessions_v2 enable row level security;
alter table public.ai_copilot_sources_v2 enable row level security;
alter table public.ai_copilot_messages_v2 enable row level security;
alter table public.ai_copilot_feedback_v2 enable row level security;
alter table public.ai_copilot_admin_events_v2 enable row level security;

drop policy if exists "Users can read own ai copilot sessions v2" on public.ai_copilot_sessions_v2;
create policy "Users can read own ai copilot sessions v2" on public.ai_copilot_sessions_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own ai copilot sessions v2" on public.ai_copilot_sessions_v2;
create policy "Users can insert own ai copilot sessions v2" on public.ai_copilot_sessions_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can update own ai copilot sessions v2" on public.ai_copilot_sessions_v2;
create policy "Users can update own ai copilot sessions v2" on public.ai_copilot_sessions_v2
for update to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own ai copilot sources v2" on public.ai_copilot_sources_v2;
create policy "Users can read own ai copilot sources v2" on public.ai_copilot_sources_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own ai copilot sources v2" on public.ai_copilot_sources_v2;
create policy "Users can insert own ai copilot sources v2" on public.ai_copilot_sources_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own ai copilot messages v2" on public.ai_copilot_messages_v2;
create policy "Users can read own ai copilot messages v2" on public.ai_copilot_messages_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own ai copilot messages v2" on public.ai_copilot_messages_v2;
create policy "Users can insert own ai copilot messages v2" on public.ai_copilot_messages_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own ai copilot feedback v2" on public.ai_copilot_feedback_v2;
create policy "Users can read own ai copilot feedback v2" on public.ai_copilot_feedback_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own ai copilot feedback v2" on public.ai_copilot_feedback_v2;
create policy "Users can insert own ai copilot feedback v2" on public.ai_copilot_feedback_v2
for insert to authenticated
with check (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can read own ai copilot admin events v2" on public.ai_copilot_admin_events_v2;
create policy "Users can read own ai copilot admin events v2" on public.ai_copilot_admin_events_v2
for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Users can insert own ai copilot admin events v2" on public.ai_copilot_admin_events_v2;
create policy "Users can insert own ai copilot admin events v2" on public.ai_copilot_admin_events_v2
for insert to authenticated
with check (user_id is null or auth.uid() = user_id or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create or replace function public.touch_ai_copilot_v2_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_ai_copilot_sessions_v2_updated_at on public.ai_copilot_sessions_v2;
create trigger touch_ai_copilot_sessions_v2_updated_at
before update on public.ai_copilot_sessions_v2
for each row execute function public.touch_ai_copilot_v2_updated_at();
