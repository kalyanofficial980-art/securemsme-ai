# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 72 QA: Customer Onboarding Wizard + First Scan Funnel

Database:

- Run `supabase/mega-part-72-customer-onboarding-first-scan.sql`
- Confirm tables:
  - `customer_onboarding_profiles_v2`
  - `customer_onboarding_steps_v2`
  - `customer_first_scan_funnels_v2`
  - `customer_plan_recommendations_v2`
  - `customer_onboarding_admin_events_v2`

Pages:

- `/onboarding`
- `/onboarding/first-scan`
- `/onboarding/success`
- `/admin/onboarding`

Workflow:

1. Login.
2. Open `/onboarding`.
3. Save business profile.
4. Confirm plan recommendation appears.
5. Open `/onboarding/first-scan`.
6. Enter website URL.
7. Confirm ownership/written permission.
8. Prepare first scan funnel.
9. Open `/onboarding/success`.
10. Open `/admin/onboarding`.

Safety:

- Website authorization required.
- No aggressive scan automation.
- No payment/card/UPI PIN/OTP collection.
- No guarantee that all vulnerabilities are found.
- No compliance certification claim.
