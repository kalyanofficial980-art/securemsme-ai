# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 65 QA: Billing + AI Triage + Usage Limits

Database:

- Run `supabase/mega-part-65-billing-ai-triage-usage-limits.sql`
- Confirm tables:
  - `billing_plan_catalog_v2`
  - `user_billing_profiles_v2`
  - `usage_counters_v2`
  - `usage_events_v2`
  - `ai_triage_runs_v2`
  - `ai_triage_items_v2`
  - `billing_ai_triage_events_v2`

Public/account:

- `/billing-ai-triage` opens.
- Login and create billing profile.
- Change manual plan.
- Confirm usage bars show current limits.

Report workflow:

- Open `/report/[scan-id]/billing-ai-triage`.
- Run AI triage.
- Confirm triage score, business impact, efficiency and confidence score.
- Confirm prioritized remediation order.
- Confirm usage counter increases for AI triage.

Admin:

- `/admin/billing-ai-triage` requires admin.
- Admin can view billing profiles, usage events and triage runs.

Safety:

- No real payment provider secrets.
- No exploit payload ranking.
- No destructive automation.
- No private customer data.
- No fake vulnerability certainty.
- No 100% security claim.
