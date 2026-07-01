-- Mega Part 22: Ownership verification and authorized deep scan unlock
-- Run this in Supabase SQL Editor.

alter table public.websites add column if not exists verification_token text;
alter table public.websites add column if not exists verification_method text not null default 'dns_txt';
alter table public.websites add column if not exists verification_status text not null default 'unverified';
alter table public.websites add column if not exists verified_at timestamptz;
alter table public.websites add column if not exists verified_by uuid references auth.users(id) on delete set null;
alter table public.websites add column if not exists permission_attested_at timestamptz;
alter table public.websites add column if not exists deep_scan_enabled boolean not null default false;

create index if not exists websites_verification_status_idx
on public.websites(user_id, verification_status);

create index if not exists websites_deep_scan_enabled_idx
on public.websites(user_id, deep_scan_enabled);
