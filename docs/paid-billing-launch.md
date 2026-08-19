# VeyraSec paid billing launch checklist

VeyraSec uses recurring monthly Razorpay Subscriptions for Starter, Growth and Agency. Billing remains fail-closed until the correct database, Razorpay Plan IDs, API credentials and webhook secret are configured. Never put a Razorpay Key Secret, webhook secret or Supabase service-role key in frontend code, screenshots, chat, logs or Git history.

## Launch pricing

| Plan | Monthly price | Provider amount | Scan limit |
| --- | ---: | ---: | ---: |
| Starter | ₹999/month | 99900 paise | 20/month |
| Growth | ₹2,499/month | 249900 paise | 100/month |
| Agency | ₹6,999/month | 699900 paise | 500/month |
| Enterprise Review | Custom | Manual | Manual scope |

Free remains the evaluation tier with the existing daily scan limit. No separate paid trial or annual commitment is enabled for the first launch.

## Required server environment variables

```text
RAZORPAY_KEY_ID=rzp_test_or_live_key_id
RAZORPAY_KEY_SECRET=server_only_secret
RAZORPAY_WEBHOOK_SECRET=separate_webhook_secret
RAZORPAY_STARTER_PLAN_ID=plan_...
RAZORPAY_GROWTH_PLAN_ID=plan_...
RAZORPAY_AGENCY_PLAN_ID=plan_...
SUPABASE_SERVICE_ROLE_KEY=server_only_service_role_key
```

The three Razorpay Plan IDs must point to monthly INR plans whose amount, currency, period and interval exactly match the VeyraSec server-side launch pricing. The subscription-create API fetches and validates each provider Plan before opening checkout, so a dashboard pricing mismatch fails closed.

## Razorpay Plans

Create separate Plans in Razorpay **Test Mode** first:

- Starter: INR 999, period `monthly`, interval `1`
- Growth: INR 2,499, period `monthly`, interval `1`
- Agency: INR 6,999, period `monthly`, interval `1`

After full Test Mode E2E validation, create equivalent **Live Mode** plans and replace the environment Plan IDs together with the Live API credentials. Never mix Test and Live Plan IDs or credentials.

## Database migration

Apply `supabase/migrations/20260819082000_paid_billing_foundation.sql` to the **same Supabase project used by the production Vercel environment** before enabling checkout.

The migration adds:

- payment audit metadata and provider idempotency indexes
- `profiles.plan_expires_at` for time-bounded paid entitlements
- `billing_subscriptions` for Razorpay subscription state, provider Plan ID, paid period and cancellation state
- `payment_webhook_events` for webhook replay/idempotency tracking
- RLS plus revoked direct anon/authenticated access to billing-internal tables

## Razorpay Dashboard

1. Start in Test Mode.
2. Generate Test API keys.
3. Create the three monthly Plans listed above.
4. Configure the webhook endpoint as `/api/billing/webhook` on the final HTTPS domain.
5. Use a separate webhook secret and store it only as a server environment variable.
6. Subscribe to the subscription lifecycle events required by the implementation, including `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.paused`, `subscription.resumed`, `subscription.updated`, `subscription.cancelled` and `subscription.completed`.
7. Run authorization, recurring charge, webhook retry, cancellation and expiry tests before switching to Live Mode.

## Server flow implemented

1. Authenticated user requests a recurring checkout at `POST /api/billing/subscription`.
2. The server chooses the plan and amount from VeyraSec configuration; client-provided amounts are never accepted.
3. VeyraSec fetches the configured Razorpay Plan and validates amount/currency/monthly interval before creating a subscription.
4. The browser receives only the public Razorpay Key ID and provider subscription ID, then loads Razorpay-hosted Standard Checkout.
5. Checkout success is verified at `POST /api/billing/subscription/verify` with HMAC-SHA256 using the server-known subscription ID, followed by a provider subscription lookup.
6. Paid entitlements activate only when the provider subscription is `active` with a future paid-period end.
7. Scan, retest and authorized deep-scan limits use the effective plan and expiry instead of trusting a stale profile label.
8. `POST /api/billing/webhook` verifies the raw-body signature, records events idempotently, validates recurring charge amount/currency/capture state, and synchronizes lifecycle/expiry state.
9. `POST /api/billing/subscription/cancel` requests cancellation at the current billing-cycle end when a paid cycle exists; otherwise it cancels immediately. Paid access is preserved only through the already-paid period.
10. Legacy one-time paid-plan order/verification endpoints are removed from the launch branch so they cannot accidentally activate recurring paid access.

## Customer-facing billing controls

- `/pricing` shows the exact monthly prices and truthful current feature scope.
- `/billing` shows effective plan, subscription status, current paid period and cancellation state.
- Customers can cancel recurring billing from `/billing`.
- VeyraSec forms never request card numbers, OTPs, UPI PINs or banking passwords; payment credentials remain inside Razorpay Checkout.

## Required pre-launch validation

- reconcile the production Vercel Supabase URL with the Supabase project receiving the migration
- apply the migration only after that backend identity is confirmed
- configure Test API keys, webhook secret and Test Plan IDs in Vercel
- verify `/pricing` CSP allows Razorpay Checkout but does not expose server secrets
- test first subscription activation and confirm `profiles.plan` plus `plan_expires_at`
- test paid scan limits and an expired entitlement falling back to Free
- test `subscription.charged`, duplicate webhook delivery and out-of-order/retry behavior
- test failed/pending/halted states without granting unpaid future access
- test cancel-at-cycle-end and confirm access remains only through the paid period
- test immediate cancellation before a paid cycle begins
- confirm support, refund, GST/tax invoice and legal cancellation wording before Live Mode
- repeat the payment lifecycle using controlled Live credentials and a real transaction before public paid launch
