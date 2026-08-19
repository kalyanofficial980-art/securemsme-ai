begin;

alter table public.payments
  add column if not exists plan text,
  add column if not exists receipt text,
  add column if not exists captured_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists payments_user_id_idx
  on public.payments (user_id);

create unique index if not exists payments_razorpay_order_id_uidx
  on public.payments (razorpay_order_id)
  where razorpay_order_id is not null;

create unique index if not exists payments_razorpay_payment_id_uidx
  on public.payments (razorpay_payment_id)
  where razorpay_payment_id is not null;

create unique index if not exists payments_receipt_uidx
  on public.payments (receipt)
  where receipt is not null;

create table if not exists public.payment_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing',
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint payment_webhook_events_status_check
    check (status in ('processing', 'processed', 'failed'))
);

alter table public.payment_webhook_events enable row level security;

revoke all on table public.payment_webhook_events from anon, authenticated;

commit;
