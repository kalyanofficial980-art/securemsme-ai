create table if not exists public.payment_settings_v1 (
  id text primary key default 'primary' check (id = 'primary'),
  payee_name text not null default 'VeyraSec' check (char_length(trim(payee_name)) between 2 and 120),
  upi_enabled boolean not null default false,
  upi_id text,
  bank_enabled boolean not null default false,
  bank_account_name text,
  bank_name text,
  bank_account_number text,
  bank_ifsc text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint payment_settings_upi_valid check (
    not upi_enabled or (
      upi_id is not null and trim(upi_id) ~ '^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$'
    )
  ),
  constraint payment_settings_bank_valid check (
    not bank_enabled or (
      bank_account_name is not null and char_length(trim(bank_account_name)) between 2 and 120 and
      bank_name is not null and char_length(trim(bank_name)) between 2 and 120 and
      bank_account_number is not null and trim(bank_account_number) ~ '^[0-9]{6,24}$' and
      bank_ifsc is not null and upper(trim(bank_ifsc)) ~ '^[A-Z]{4}0[A-Z0-9]{6}$'
    )
  )
);

alter table public.payment_settings_v1 enable row level security;

revoke all on table public.payment_settings_v1 from anon;
revoke all on table public.payment_settings_v1 from authenticated;
grant select, insert, update on table public.payment_settings_v1 to authenticated;

create policy payment_settings_admin_select_v1
on public.payment_settings_v1
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy payment_settings_admin_insert_v1
on public.payment_settings_v1
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy payment_settings_admin_update_v1
on public.payment_settings_v1
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

insert into public.payment_settings_v1 (id, payee_name, upi_enabled, bank_enabled)
values ('primary', 'VeyraSec', false, false)
on conflict (id) do nothing;
