# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 64 QA: Monitoring Pro + Agency SOC

Database:

- Run `supabase/mega-part-64-monitoring-pro-agency-soc.sql`
- Confirm tables:
  - `monitoring_pro_targets_v2`
  - `monitoring_pro_runs_v2`
  - `monitoring_regression_alerts_v2`
  - `agency_soc_snapshots_v2`
  - `agency_soc_client_risks_v2`
  - `monitoring_soc_events_v2`

Public:

- `/monitoring-pro` opens.

Logged-in workflow:

- Open `/report/[scan-id]/monitoring-pro`.
- Create Monitoring Pro target.
- Run Monitoring Pro.
- Confirm health, regression, risk and client readiness scores.
- Confirm alerts appear when sources indicate regression/gaps.
- Update alert status.
- Open `/agency-soc`.
- Create Agency SOC snapshot.
- Confirm client risk watchlist appears.

Admin:

- `/admin/monitoring-pro` requires admin.
- Admin can see monitoring targets and alerts.

Safety:

- Passive-safe only.
- No exploit payloads.
- No destructive testing.
- No brute force.
- No private customer data.
- No breach claim without confirmed evidence.
- No 100% security claim.
