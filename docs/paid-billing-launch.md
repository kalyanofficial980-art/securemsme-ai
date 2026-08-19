# VeyraSec paid billing launch checklist

The billing code is intentionally fail-closed until real prices and Razorpay credentials are configured. Never put a Razorpay Key Secret or webhook secret in frontend code or Git history.

## Required server environment variables

```text
RAZORPAY_KEY_ID=rzp_test_or_live_key_id
RAZORPAY_KEY_SECRET=server_only_secret
RAZORPAY_WEBHOOK_SECRET=separate_webhook_secret
RAZORPAY_STARTER_AMOUNT=amount_in_paise
RAZORPAY_GROWTH_AMOUNT=amount_in_paise
RAZORPAY_AGENCY_AMOUNT=amount_in_paise
SUPABASE_SERVICE_ROLE_KEY=server_only_service_role_key
```

Amounts are integer currency subunits. Example only: INR 299 would be `29900`. Do not copy example pricing into production without an approved pricing decision.

## Database migration

Apply `supabase/migrations/20260819082000_paid_billing_foundation.sql` to the same Supabase project used by the production Vercel environment before enabling checkout.

The migration adds:
- plan and receipt metadata to `payments`
- captured/updated timestamps
- unique provider order/payment identifiers
- an index on `payments.user_id`
- `payment_webhook_events` for replay/idempotency tracking

## Razorpay Dashboard

1. Start in Test Mode.
2. Generate API keys.
3. Configure the webhook endpoint as `/api/billing/webhook` on the final HTTPS production domain.
4. Subscribe at minimum to `payment.captured`, `payment.failed`, and `order.paid`.
5. Store the webhook secret only as a server environment variable.
6. Run end-to-end test payments and webhook retries before switching to Live Mode.

## Server flow implemented

1. Authenticated user requests an order at `POST /api/billing/order`.
2. The server chooses the amount from server environment configuration; client-provided amounts are ignored.
3. Razorpay creates the order and VeyraSec stores it in `payments`.
4. Checkout success is verified at `POST /api/billing/verify` using the Razorpay signature and a server-side provider payment lookup.
5. A plan is activated only if Razorpay reports the payment as `captured` and order amount/currency match the stored server-side order.
6. `POST /api/billing/webhook` verifies the raw-body HMAC signature and processes events idempotently.
7. Buying a lower plan never automatically downgrades an already higher active plan.

## Before exposing a Pay button

- approve Starter/Growth/Agency prices
- configure Razorpay Test keys and webhook secret
- apply the billing migration to the correct production Supabase project
- confirm Vercel production and Supabase connector/project IDs point to the same backend
- add Standard Checkout client UI and CSP allowances for Razorpay-hosted checkout
- test success, failure, cancel, duplicate webhook, delayed webhook and amount-mismatch paths
- confirm refund/cancellation/invoice/GST policy and customer support contact
- repeat all tests with Live Mode credentials using a controlled real transaction
