# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 73 QA: Public Landing Page + Pricing + Demo Funnel

Database:

- Run `supabase/mega-part-73-public-landing-pricing-demo.sql`
- Confirm tables:
  - `public_demo_requests_v2`
  - `public_pricing_interests_v2`
  - `public_landing_events_v2`
  - `public_demo_admin_events_v2`

Pages:

- `/public-launch`
- `/pricing`
- `/demo`
- `/demo/success`
- `/admin/demo-funnel`

Workflow:

1. Open `/public-launch` without login.
2. Open `/pricing` without login.
3. Submit pricing interest.
4. Open `/demo`.
5. Submit demo request with consent checkboxes.
6. Confirm `/demo/success` opens.
7. Login as admin.
8. Open `/admin/demo-funnel`.
9. Update demo lead status.

Safety:

- No card data collection.
- No UPI PIN/OTP collection.
- No password/API token/private key collection.
- No 100% secure claim.
- No all-vulnerabilities-found claim.
- No legal compliance certificate claim.
- Demo request only; manual billing CTA only.
