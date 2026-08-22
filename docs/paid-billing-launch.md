# VeyraSec assisted paid public-launch runbook

VeyraSec currently uses assisted monthly activation. Customers can select Starter, Growth or Agency in the application, pay using the configured UPI QR or bank-transfer instructions, submit the transaction reference plus a payment screenshot, and wait for an admin to independently verify the payment. Paid access must never activate from client state, a UTR alone, or a screenshot alone.

## Launch plans

| Plan | Price | Scan limit | Websites | Monitoring targets | Retest | Deep Scan |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Starter | ₹999/month | 20/month | 1 | 1 | Yes | No |
| Growth | ₹2,499/month | 100/month | 5 | 5 | Yes | Yes |
| Agency | ₹6,999/month | 500/month | 25 | 25 | Yes | Yes |

Free remains the evaluation tier with 3 scans per day, 1 website and 1 monitoring target. Deep Scan is available only to Growth and Agency and still requires fresh ownership verification for the target.

## Customer payment flow

1. Customer signs in with Google and accepts the required legal documents.
2. Customer chooses Starter, Growth or Agency.
3. The server returns the configured exact plan amount and the enabled UPI QR and/or bank-transfer instructions.
4. Customer makes the real payment outside VeyraSec using their payment app or bank.
5. Customer enters the transaction reference/UTR. References up to 256 characters are accepted.
6. Customer uploads a required payment confirmation screenshot. Accepted formats are PNG, JPEG and WebP, maximum 5 MB. File type and file signature are validated.
7. The application uploads the proof through the trusted server path into the private `payment-proofs` bucket. Direct customer storage writes are not the activation mechanism.
8. A `manual_payment_requests_v2` row is created with status `submitted_for_review`. The existing plan remains unchanged.
9. Admin opens the private proof through a short-lived signed URL and independently verifies the real receipt/UTR and exact amount through the approved payment channel.
10. Admin approves or rejects the request. Approval is allowed only when the private proof is present and passes validation again.
11. Approval activates the paid plan and its expiry. Rejection does not activate paid access.
12. After paid expiry, effective access falls back to Free. Renewal remains assisted/manual during this launch phase.

If the trusted proof upload succeeds but the payment-request insert fails, the application attempts trusted cleanup of the unreferenced proof object. A proof already referenced by a payment request must not be deleted by that cleanup path.

## Payment-safety rules

Never request or store OTPs, UPI PINs, card PINs, banking passwords, private keys, session cookies or infrastructure secrets in payment forms, screenshots, chat, logs or Git history. Customers should crop unrelated account information from screenshots where possible.

A transaction reference is not proof by itself. A screenshot is not proof by itself. Admin activation happens only after independent payment verification. No browser flag, local storage value or client-side plan field may activate paid entitlements.

## Server-side entitlement rules

Plan limits are enforced on trusted server/database paths, not only in the UI. Scan quota reservation is atomic. Website and monitoring caps are server enforced. Retest requires a paid effective plan. Deep Scan requires Growth or Agency plus fresh ownership verification.

`plan_expires_at` / the effective paid-period expiry is authoritative when present. Expired paid access must resolve to Free.

## Admin review rules

Before approval, confirm all of the following:

- request is still `submitted_for_review`;
- requested plan, billing cycle, INR amount and payment method match canonical server definitions;
- `payment_proof_path` is present and belongs to the requesting user path;
- the private proof can be opened by the admin and passes image-signature validation;
- the real bank/UPI receipt and UTR/reference have been independently verified;
- the paid amount exactly matches the requested plan;
- there is no evidence the same transaction reference is being reused.

Approval must record the admin review and activate the plan only through the trusted admin path. Founder/admin accounts are operational identities and are not customer paid profiles.

## Production launch gate

Public paid launch is GO only after one real, separate non-admin customer completes the full Growth lifecycle successfully:

`Google sign-in → legal acceptance → Growth selection → real ₹2,499 payment → UTR + screenshot submission → pending review with no activation → admin independent verification → approval → Growth activation → owned website + fresh ownership verification → normal scan → report/PDF → Retest → Deep Scan → quota/persistence checks`.

Also verify expiry fallback and tenant isolation. Do not substitute seeded rows, fake UTRs, manual plan flags or founder/admin activity for this launch gate.

## Automatic billing later

There is no automatic recurring payment gateway in this launch flow. Do not enable self-serve recurring billing until provider KYC/live approval, settlement/refund operations, production credentials, webhook signature verification, idempotency, renewal/cancellation/failure handling and a controlled live-payment test are all complete.
