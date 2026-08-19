# VeyraSec assisted paid-launch checklist

VeyraSec uses assisted monthly plan activation for the initial paid launch. Automatic Razorpay subscription checkout is intentionally not exposed until the payment account, KYC, settlement setup and production operations are ready.

## Launch pricing

| Plan | Monthly price | Scan limit |
| --- | ---: | ---: |
| Starter | ₹999/month | 20/month |
| Growth | ₹2,499/month | 100/month |
| Agency | ₹6,999/month | 500/month |
| Enterprise Review | Custom | Manual scope |

Free remains the evaluation tier with the existing daily scan limit.

## Customer flow

1. Customer chooses Starter, Growth or Agency.
2. Customer contacts the official VeyraSec billing/support channel.
3. Approved payment instructions are shared outside sensitive application fields.
4. Customer provides only the transaction reference/UTR needed for verification.
5. Admin verifies the payment and activates `profiles.plan` with an appropriate `plan_expires_at`.
6. Server-side scan limits use the effective plan and automatically fall back to Free after expiry.
7. Renewal is assisted/manual during this launch phase.

## Payment-safety rules

Never request or store OTPs, UPI PINs, card PINs, banking passwords, private keys, session cookies or Supabase/Razorpay secrets in customer-facing forms, screenshots, chat, logs or Git history.

A transaction reference is not proof by itself. Admin activation should happen only after payment is independently verified through the approved payment channel.

## Server-side entitlement rules

The application must enforce plan limits on API routes, not only in the UI:

- Free: 3 scans/day
- Starter: 20 scans/month
- Growth: 100 scans/month
- Agency: 500 scans/month

`plan_expires_at` is authoritative when present. Expired paid access must resolve to the Free plan.

## Existing database foundation

The paid-billing foundation migration may include tables reserved for future automated billing. Those tables remain server-only and are not a customer-facing payment flow during the assisted launch. Public self-serve subscription endpoints and checkout UI are intentionally disabled.

## Before enabling automatic billing later

Do not enable self-serve recurring billing until all of the following are complete:

- payment-provider KYC and live account approval;
- settlement and refund operations tested;
- production credentials stored only in server environment variables;
- webhook signature verification and idempotency tested;
- payment failure, renewal, cancellation and expiry flows tested end to end;
- support and refund processes documented;
- one controlled live-payment test completed successfully.

Until then, assisted activation is the production billing model.
