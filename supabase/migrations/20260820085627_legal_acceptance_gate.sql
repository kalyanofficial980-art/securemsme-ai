begin;

create table if not exists public.user_legal_acceptances_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  acceptable_use_version text not null,
  refund_version text not null,
  data_processing_version text not null,
  disclaimer_version text not null,
  acceptance_status text not null default 'accepted' check (acceptance_status = 'accepted'),
  acceptance_source text not null default 'dashboard',
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (
    user_id,
    terms_version,
    privacy_version,
    acceptable_use_version,
    refund_version,
    data_processing_version,
    disclaimer_version
  )
);

create index if not exists user_legal_acceptances_user_date_idx
  on public.user_legal_acceptances_v2 (user_id, accepted_at desc);

alter table public.user_legal_acceptances_v2 enable row level security;
revoke all on public.user_legal_acceptances_v2 from public, anon;
grant select, insert, update on public.user_legal_acceptances_v2 to authenticated;

drop policy if exists "legal acceptance own select" on public.user_legal_acceptances_v2;
create policy "legal acceptance own select"
on public.user_legal_acceptances_v2 for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "legal acceptance own insert" on public.user_legal_acceptances_v2;
create policy "legal acceptance own insert"
on public.user_legal_acceptances_v2 for insert to authenticated
with check (
  user_id = (select auth.uid())
  and acceptance_status = 'accepted'
);

drop policy if exists "legal acceptance own update" on public.user_legal_acceptances_v2;
create policy "legal acceptance own update"
on public.user_legal_acceptances_v2 for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and acceptance_status = 'accepted'
);

create table if not exists public.launch_ready_user_preferences_v2 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ui_mode text not null default 'launch-simple',
  show_internal_tools boolean not null default false,
  show_admin_shortcuts boolean not null default false,
  show_agency_tools boolean not null default false,
  launch_packaging_status text not null default 'ready-clean-ui',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.launch_ready_user_preferences_v2 enable row level security;
revoke all on public.launch_ready_user_preferences_v2 from public, anon;
grant select, insert, update on public.launch_ready_user_preferences_v2 to authenticated;

drop policy if exists "launch preferences own select" on public.launch_ready_user_preferences_v2;
create policy "launch preferences own select"
on public.launch_ready_user_preferences_v2 for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "launch preferences own insert" on public.launch_ready_user_preferences_v2;
create policy "launch preferences own insert"
on public.launch_ready_user_preferences_v2 for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "launch preferences own update" on public.launch_ready_user_preferences_v2;
create policy "launch preferences own update"
on public.launch_ready_user_preferences_v2 for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

commit;
