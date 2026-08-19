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

alter table public.profiles
  add column if not exists plan_expires_at timestamptz;

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null,
  razorpay_subscription_id text not null unique,
  razorpay_plan_id text not null,
  status text not null default 'created',
  amount bigint not null,
  currency text not null default 'INR',
  billing_period text not null default 'monthly',
  billing_interval integer not null default 1,
  total_count integer not null default 120,
  paid_count integer not null default 0,
  latest_payment_id text,
  current_start timestamptz,
  current_end timestamptz,
  ended_at timestamptz,
  activated_at timestamptz,
  cancel_requested_at timestamptz,
  cancel_at_cycle_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscriptions_plan_check
    check (plan in ('starter', 'growth', 'agency')),
  constraint billing_subscriptions_status_check
    check (
      status in (
        'created',
        'authenticated',
        'active',
        'pending',
        'halted',
        'paused',
        'cancelled',
        'completed',
        'expired',
        'verification_mismatch'
      )
    ),
  constraint billing_subscriptions_amount_check check (amount > 0),
  constraint billing_subscriptions_currency_check check (currency = 'INR'),
  constraint billing_subscriptions_interval_check check (billing_interval > 0),
  constraint billing_subscriptions_total_count_check check (total_count > 0)
);

create index if not exists billing_subscriptions_user_id_idx
  on public.billing_subscriptions (user_id);

create index if not exists billing_subscriptions_user_status_idx
  on public.billing_subscriptions (user_id, status, created_at desc);

create unique index if not exists billing_subscriptions_latest_payment_id_uidx
  on public.billing_subscriptions (latest_payment_id)
  where latest_payment_id is not null;

alter table public.billing_subscriptions enable row level security;
revoke all on table public.billing_subscriptions from anon, authenticated;

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
