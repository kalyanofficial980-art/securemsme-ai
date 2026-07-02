-- Mega Part 51: Client Portal + Shareable Report Access Foundation

create extension if not exists pgcrypto;

create table if not exists public.client_portal_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  scan_id uuid not null references public.scans(id) on delete cascade,

  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  client_name text,
  client_email text,
  access_level text not null default 'report-hub'
    check (access_level in ('summary-only', 'report-hub', 'monitoring-summary', 'full-client')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),

  title text not null default 'Client security report',
  client_snapshot jsonb not null default '{}'::jsonb,
  allowed_sections jsonb not null default '[]'::jsonb,
  safe_disclaimer text not null default 'This client portal is an evidence-based security posture summary. It is not a full penetration test certificate, compliance certificate, or guarantee that every vulnerability was found.',

  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_portal_access_events (
  id uuid primary key default gen_random_uuid(),
  client_portal_link_id uuid references public.client_portal_links(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  scan_id uuid references public.scans(id) on delete set null,

  event_type text not null default 'portal-info'
    check (event_type in ('portal-info', 'link-created', 'link-viewed', 'link-revoked', 'link-paused', 'access-denied', 'snapshot-refreshed')),
  severity text not null default 'Info'
    check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  title text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists client_portal_links_user_id_idx on public.client_portal_links(user_id);
create index if not exists client_portal_links_org_id_idx on public.client_portal_links(organization_id);
create index if not exists client_portal_links_scan_id_idx on public.client_portal_links(scan_id);
create index if not exists client_portal_links_token_idx on public.client_portal_links(token);
create index if not exists client_portal_links_status_idx on public.client_portal_links(status);
create index if not exists client_portal_links_expires_at_idx on public.client_portal_links(expires_at);

create index if not exists client_portal_events_link_id_idx on public.client_portal_access_events(client_portal_link_id);
create index if not exists client_portal_events_user_id_idx on public.client_portal_access_events(user_id);
create index if not exists client_portal_events_org_id_idx on public.client_portal_access_events(organization_id);
create index if not exists client_portal_events_created_at_idx on public.client_portal_access_events(created_at desc);

alter table public.client_portal_links enable row level security;
alter table public.client_portal_access_events enable row level security;

drop policy if exists "Users and admins can read own client portal links" on public.client_portal_links;
create policy "Users and admins can read own client portal links"
on public.client_portal_links
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  or (organization_id is not null and public.is_organization_member(organization_id))
);

drop policy if exists "Users can insert own client portal links" on public.client_portal_links;
create policy "Users can insert own client portal links"
on public.client_portal_links
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    organization_id is null
    or public.is_organization_member(organization_id)
  )
);

drop policy if exists "Users and org admins can update client portal links" on public.client_portal_links;
create policy "Users and org admins can update client portal links"
on public.client_portal_links
for update
to authenticated
using (
  auth.uid() = user_id
  or (organization_id is not null and public.is_organization_admin(organization_id))
)
with check (
  auth.uid() = user_id
  or (organization_id is not null and public.is_organization_admin(organization_id))
);

drop policy if exists "Users and admins can read client portal events" on public.client_portal_access_events;
create policy "Users and admins can read client portal events"
on public.client_portal_access_events
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  or (organization_id is not null and public.is_organization_member(organization_id))
);

drop policy if exists "Users can insert client portal events" on public.client_portal_access_events;
create policy "Users can insert client portal events"
on public.client_portal_access_events
for insert
to authenticated
with check (
  user_id is null
  or auth.uid() = user_id
  or (organization_id is not null and public.is_organization_member(organization_id))
);

create or replace function public.set_client_portal_links_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_client_portal_links_updated_at on public.client_portal_links;
create trigger set_client_portal_links_updated_at
before update on public.client_portal_links
for each row
execute function public.set_client_portal_links_updated_at();

-- Public token function: only returns one active non-expired safe snapshot by exact token.
-- It does not expose raw scan rows.
create or replace function public.get_client_portal_link(public_token text)
returns table (
  id uuid,
  token text,
  title text,
  client_name text,
  access_level text,
  website_url text,
  client_snapshot jsonb,
  allowed_sections jsonb,
  safe_disclaimer text,
  expires_at timestamptz,
  view_count integer,
  last_viewed_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.client_portal_links
  set view_count = view_count + 1,
      last_viewed_at = now()
  where client_portal_links.token = public_token
    and client_portal_links.status = 'active'
    and client_portal_links.expires_at > now();

  insert into public.client_portal_access_events (
    client_portal_link_id,
    user_id,
    organization_id,
    scan_id,
    event_type,
    severity,
    title,
    details,
    metadata
  )
  select
    client_portal_links.id,
    client_portal_links.user_id,
    client_portal_links.organization_id,
    client_portal_links.scan_id,
    'link-viewed',
    'Info',
    'Client portal viewed',
    'A shareable client portal link was viewed.',
    jsonb_build_object('tokenPrefix', left(public_token, 8))
  from public.client_portal_links
  where client_portal_links.token = public_token
    and client_portal_links.status = 'active'
    and client_portal_links.expires_at > now();

  return query
  select
    client_portal_links.id,
    client_portal_links.token,
    client_portal_links.title,
    client_portal_links.client_name,
    client_portal_links.access_level,
    coalesce(client_portal_links.client_snapshot->>'websiteUrl', 'Client website') as website_url,
    client_portal_links.client_snapshot,
    client_portal_links.allowed_sections,
    client_portal_links.safe_disclaimer,
    client_portal_links.expires_at,
    client_portal_links.view_count,
    client_portal_links.last_viewed_at,
    client_portal_links.created_at
  from public.client_portal_links
  where client_portal_links.token = public_token
    and client_portal_links.status = 'active'
    and client_portal_links.expires_at > now()
  limit 1;
end;
$$;

grant execute on function public.get_client_portal_link(text) to anon, authenticated;
