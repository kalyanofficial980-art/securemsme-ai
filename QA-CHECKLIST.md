# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npx.cmd vitest run src/lib/final-launch-ops-engine.test.ts
npm.cmd run build
npx.cmd playwright test tests/e2e/final-launch-ops-pack.spec.ts --project=chromium
```

## Mega Part 76 QA: Final Launch Operations Pack

Database:

- Run `supabase/mega-part-76-final-launch-operations-pack.sql`
- Confirm tables:
  - `launch_email_notification_jobs_v2`
  - `launch_abuse_guard_rules_v2`
  - `launch_rate_limit_events_v2`
  - `launch_beta_customers_v2`
  - `launch_final_checklist_items_v2`
  - `launch_crm_exports_v2`
  - `launch_ops_events_v2`

Pages:

- `/beta`
- `/launch-final-checklist`
- `/admin/launch-ops`
- `/admin/lead-crm`
- `/admin/lead-crm/export`
- `/admin/abuse-protection`

Workflow:

1. Open `/beta`.
2. Login as admin.
3. Open `/admin/launch-ops`.
4. Update checklist item.
5. Create beta customer.
6. Queue manual notification.
7. Open `/admin/lead-crm`.
8. Download CSV export.
9. Open `/admin/abuse-protection`.
10. Record abuse test event.

Domain later:

- Custom domain is intentionally marked later.
- SPF/DKIM/DMARC are intentionally marked later.
- Search Console/Bing Webmaster are intentionally marked later.

Safety:

- No automatic email sending.
- No cold/bulk spam.
- No cookies or fingerprinting.
- No passwords/OTP/UPI PIN/card data/API token/private key collection.
- No 100% secure claim.
- No all-vulnerabilities-found claim.
- No legal compliance certificate claim.
