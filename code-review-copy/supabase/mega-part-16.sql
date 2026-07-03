alter table public.websites add column if not exists monitoring_enabled boolean not null default true;
alter table public.websites add column if not exists scan_frequency text not null default 'weekly';
alter table public.websites add column if not exists last_scan_at timestamptz;
alter table public.websites add column if not exists next_scan_at timestamptz;
alter table public.websites add column if not exists latest_score integer;
alter table public.websites add column if not exists latest_risk_level text;
alter table public.websites add column if not exists latest_scan_id uuid references public.scans(id) on delete set null;

create index if not exists websites_monitoring_idx
on public.websites(user_id, monitoring_enabled, next_scan_at);

create index if not exists websites_latest_risk_idx
on public.websites(user_id, latest_risk_level);

with latest as (
  select distinct on (website_id)
    website_id,
    id as scan_id,
    score,
    risk_level,
    created_at
  from public.scans
  where website_id is not null
  order by website_id, created_at desc
)
update public.websites w
set
  last_scan_at = latest.created_at,
  next_scan_at = coalesce(w.next_scan_at, latest.created_at + interval '7 days'),
  latest_score = latest.score,
  latest_risk_level = latest.risk_level,
  latest_scan_id = latest.scan_id,
  updated_at = now()
from latest
where w.id = latest.website_id;
