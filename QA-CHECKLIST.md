# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 61 QA: Client Report v4 + Executive Dashboard

Database:

- Run `supabase/mega-part-61-client-report-v4-executive-dashboard.sql`
- Confirm tables:
  - `client_report_v4_snapshots`
  - `client_report_v4_sections`
  - `executive_security_metrics_v4`
  - `client_report_v4_events`

Public:

- `/client-report-v4` opens.

Logged-in report workflow:

- Open `/report/[scan-id]/client-report-v4`.
- Generate Client Report v4 snapshot.
- Confirm executive score appears.
- Confirm readiness, business risk, technical risk and evidence strength appear.
- Confirm sections appear:
  - Executive Summary
  - Business Impact
  - Surface Summary
  - Developer Action Plan
  - Evidence and Confidence
  - Limitations
- Confirm no 100% security wording.
- Confirm no legal compliance certificate wording.
- Confirm no private data appears.

Admin:

- `/admin/client-report-v4` requires admin.
- Admin can view report snapshots.

Recommended before generating:

- Run Advanced Crawler
- Run API Security Review
- Run Authenticated Safe Review when in scope
- Run Evidence Warehouse
- Run Accuracy Foundation
- Run Advanced Vulnerability Engine
