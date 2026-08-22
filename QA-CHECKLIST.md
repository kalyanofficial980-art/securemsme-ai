# VeyraSec paid public-launch QA checklist

Use this checklist for the production paid-launch decision. Final result is binary: GO or NO-GO.

## Automated validation

Run on the exact candidate commit:

```bash
npm ci --no-audit --no-fund
npm test
npm run build
```

The full test suite must pass, including scanner truth/scoring, Deep navigation safety, payment-proof validation, entitlements, ownership verification, tenant isolation/security policies and launch operations. The production build and TypeScript check must pass. A READY preview alone is not sufficient if CI is red.

## Deployment and baseline health

- Confirm `main` points to the intended reviewed merge commit.
- Confirm the production Vercel deployment is READY and built from that exact commit.
- Confirm `/api/health` returns HTTP 200.
- Check recent production runtime logs for error/fatal events.
- Confirm required Supabase migrations are present and the payment Edge Function is ACTIVE at the intended version.
- Confirm payment-proof storage is private and customer proof uploads use the trusted server path.

## Signed-out and authentication flow

- In a clean/private browser, open the home page, pricing and login pages.
- Signed-out navigation must not expose customer workspace links such as Dashboard, Websites, Scan or Billing as usable authenticated navigation.
- Google must be the supported customer sign-in path.
- Starting from a paid-plan URL must preserve the intended plan through authentication.
- Admin/founder accounts must redirect away from customer workspace flows.

## Legal acceptance

Using a real separate non-admin customer account:

- Attempt paid checkout before legal acceptance and confirm it is blocked.
- Open `/legal-acceptance` and review Terms, Privacy, Acceptable Use, Refund, Data Processing and Disclaimer links.
- Submit with a required checkbox missing and confirm the action is rejected.
- Accept all required documents and confirm the acceptance is persisted in `user_legal_acceptances_v2` for that customer.
- Confirm another customer cannot read or modify that acceptance row.

## Real Growth payment lifecycle

This is a mandatory launch gate. Do not fake it.

1. Sign in as a separate non-admin Google customer.
2. Select Growth and confirm the displayed amount is exactly ₹2,499/month.
3. Confirm the configured UPI QR and/or bank-transfer instructions are rendered from trusted server data.
4. Make one real ₹2,499 payment using the displayed instructions.
5. Enter the real transaction reference/UTR. Also verify a long valid reference within the 256-character limit is accepted by validation.
6. Upload a real payment confirmation screenshot.
7. Confirm missing proof is rejected.
8. Confirm an unsupported MIME type is rejected.
9. Confirm a file whose magic bytes do not match the declared image type is rejected.
10. Confirm a proof larger than 5 MB is rejected.
11. Confirm the successful request is `submitted_for_review` with canonical Growth/monthly/₹2,499 fields and a non-null proof path under the requesting user's prefix.
12. Confirm the customer remains on the previous effective plan before approval.
13. Confirm duplicate reuse of the same transaction reference is rejected.
14. If a request insert is deliberately made to fail after upload in a controlled test, confirm an unreferenced proof is cleaned up and a referenced proof is never removed by cleanup.

## Admin payment review

- Open the pending request through the real admin account.
- Confirm the private screenshot opens only through the admin review path/short-lived signed URL.
- Independently verify the bank/UPI receipt, UTR/reference and exact amount outside the customer's submitted claims.
- Confirm approval is blocked if the proof object is missing, unreadable or fails image-signature validation.
- Approve only after independent verification.
- Confirm the request becomes approved and audit/review fields are populated.
- Confirm Growth activates with an expiry/current period and no client-side flag was used.
- Confirm a rejected request does not activate paid access.

## Paid entitlement checks

With the approved Growth customer:

- Effective plan is Growth.
- Scan limit is 100/month.
- Website cap is 5.
- Monitoring-target cap is 5.
- Retest is available.
- Deep Scan is available only after fresh ownership verification.
- Attempts to exceed resource caps are rejected by trusted server/database enforcement.
- Quota reservation/release behavior remains atomic on failure paths.

## Owned-site scanner E2E

Use a website the customer owns or has written permission to test.

- Add/save the website and complete ownership verification.
- Run Normal Scan three times under materially unchanged target conditions.
- Compare canonical Security Score v2, risk level, verified findings, inconclusive checks and evidence coverage. Investigate unexplained score/risk flips before launch.
- Confirm WAF/bot-challenge, 429 and upstream 5xx responses are marked inconclusive rather than vulnerabilities.
- Confirm generic 2xx SPA/catch-all responses do not become sensitive-file exposure findings.
- Confirm sensitive-file findings require path-specific content signatures.
- Confirm legal/privacy/robots/sitemap/email/admin-route visibility do not silently drive the canonical security risk score.
- Open the persisted report and verify score, risk, severity counts and findings agree across dashboard/report surfaces.
- Generate/download the PDF and verify it reflects the same canonical report.
- Run Retest and verify comparison/persistence.
- Run Deep Scan three times after fresh ownership verification. Confirm Deep evidence remains safe GET-only/same-origin, does not submit forms or mutate state, and does not silently alter the canonical score without verified security evidence.

## Expiry and isolation

- In a controlled test, confirm an expired paid period resolves to Free entitlements.
- Confirm Retest/Deep are blocked after paid expiry as appropriate.
- Confirm customer A cannot read, scan, verify, modify, report on or use payment proof belonging to customer B.
- Confirm founder/admin operational data is excluded from customer paid counts and customer workspace behavior.

## Failure paths

- Invalid website URL is rejected safely.
- Ownership verification failure does not unlock Deep Scan.
- Scan network/WAF/upstream uncertainty does not manufacture high-confidence vulnerabilities.
- Failed scans release reserved quota when the operation does not complete.
- Payment upload/request errors do not activate plans.
- Missing payment configuration fails closed.
- Runtime/server errors return safe customer-facing messages without secrets.

## Final evidence record

Record the exact production commit SHA, Vercel deployment ID, Supabase migration versions, payment Edge Function version, CI run ID, real customer test account identifier (non-secret), payment request ID, approved plan/expiry, owned test domain, three Normal Scan IDs, three Deep Scan IDs, Retest ID and final observations.

Mark **GO** only when every mandatory item above is complete and the real Growth paid lifecycle succeeds. Otherwise mark **NO-GO** and record the blocking item. Never replace missing evidence with seeded/fabricated rows or manual plan flags.
