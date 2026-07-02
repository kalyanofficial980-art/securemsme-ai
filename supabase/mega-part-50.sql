-- Mega Part 50: Organization + Team Accounts + Agency Dashboard Foundation
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  organization_type text not null default 'agency' check (organization_type in ('solo','agency','business','enterprise')),
  status text not null default 'active' check (status in ('active','paused','disabled')),
  plan_label text not null default 'development-agency',
  website_limit integer not null default 25 check (website_limit >= 1),
  member_limit integer not null default 10 check (member_limit >= 1),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','admin','member','viewer')),
  status text not null default 'active' check (status in ('active','invited','suspended','removed')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,user_id)
);

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('admin','member','viewer')),
  invite_token text not null unique default encode(gen_random_bytes(24),'hex'),
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  message text,
  expires_at timestamptz not null default (now()+interval '7 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  event_type text not null default 'organization-info',
  severity text not null default 'Info' check (severity in ('Critical','High','Medium','Low','Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.websites add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table if exists public.scans add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table if exists public.monitoring_jobs add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table if exists public.security_alert_notifications add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table if exists public.background_worker_jobs add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists organizations_owner_user_id_idx on public.organizations(owner_user_id);
create index if not exists organization_members_org_id_idx on public.organization_members(organization_id);
create index if not exists organization_members_user_id_idx on public.organization_members(user_id);
create index if not exists organization_invites_org_id_idx on public.organization_invites(organization_id);
create index if not exists organization_activity_org_id_idx on public.organization_activity_events(organization_id);
create index if not exists websites_organization_id_idx on public.websites(organization_id);
create index if not exists scans_organization_id_idx on public.scans(organization_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;
alter table public.organization_activity_events enable row level security;

create or replace function public.is_organization_member(org_id uuid) returns boolean language sql security definer set search_path=public as $$
  select exists(select 1 from public.organization_members where organization_id=org_id and user_id=auth.uid() and status='active');
$$;
create or replace function public.is_organization_admin(org_id uuid) returns boolean language sql security definer set search_path=public as $$
  select exists(select 1 from public.organization_members where organization_id=org_id and user_id=auth.uid() and status='active' and role in ('owner','admin'));
$$;

drop policy if exists "Org read" on public.organizations;
create policy "Org read" on public.organizations for select to authenticated using (owner_user_id=auth.uid() or public.is_organization_member(id) or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
drop policy if exists "Org insert owner" on public.organizations;
create policy "Org insert owner" on public.organizations for insert to authenticated with check (owner_user_id=auth.uid());
drop policy if exists "Org update admin" on public.organizations;
create policy "Org update admin" on public.organizations for update to authenticated using (owner_user_id=auth.uid() or public.is_organization_admin(id)) with check (owner_user_id=auth.uid() or public.is_organization_admin(id));

drop policy if exists "Member read" on public.organization_members;
create policy "Member read" on public.organization_members for select to authenticated using (public.is_organization_member(organization_id) or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
drop policy if exists "Member insert" on public.organization_members;
create policy "Member insert" on public.organization_members for insert to authenticated with check (user_id=auth.uid() or public.is_organization_admin(organization_id));
drop policy if exists "Member update" on public.organization_members;
create policy "Member update" on public.organization_members for update to authenticated using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));

drop policy if exists "Invite read" on public.organization_invites;
create policy "Invite read" on public.organization_invites for select to authenticated using (public.is_organization_member(organization_id) or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
drop policy if exists "Invite insert" on public.organization_invites;
create policy "Invite insert" on public.organization_invites for insert to authenticated with check (public.is_organization_admin(organization_id));
drop policy if exists "Invite update" on public.organization_invites;
create policy "Invite update" on public.organization_invites for update to authenticated using (public.is_organization_admin(organization_id)) with check (public.is_organization_admin(organization_id));

drop policy if exists "Activity read" on public.organization_activity_events;
create policy "Activity read" on public.organization_activity_events for select to authenticated using (organization_id is null or public.is_organization_member(organization_id) or exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
drop policy if exists "Activity insert" on public.organization_activity_events;
create policy "Activity insert" on public.organization_activity_events for insert to authenticated with check (organization_id is null or public.is_organization_member(organization_id));

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
drop trigger if exists set_organization_members_updated_at on public.organization_members;
create trigger set_organization_members_updated_at before update on public.organization_members for each row execute function public.set_updated_at();
drop trigger if exists set_organization_invites_updated_at on public.organization_invites;
create trigger set_organization_invites_updated_at before update on public.organization_invites for each row execute function public.set_updated_at();
