# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 69 QA: Scheduled Scans + Email Alerts

Database:

- Run `supabase/mega-part-69-scheduled-scans-email-alerts.sql`
- Confirm tables:
  - `email_alert_preferences_v2`
  - `scheduled_scan_targets_v2`
  - `scheduled_scan_runs_v2`
  - `scheduled_scan_alerts_v2`
  - `email_alert_queue_v2`
  - `email_alert_events_v2`

Pages:

- `/scheduled-scans`
- `/report/[scan-id]/scheduled-scans`
- `/admin/scheduled-scans`

Workflow:

1. Login.
2. Open `/scheduled-scans`.
3. Save email alert preferences.
4. Create a scheduled scan target with authorization checkbox.
5. Run safe check now.
6. Confirm scheduled run appears.
7. Confirm alert appears if risk threshold is met.
8. Confirm email queue item appears as `provider-not-configured`.
9. Admin opens `/admin/scheduled-scans`.

Safety:

- No aggressive scanning.
- No exploit payloads.
- No destructive automation.
- No unauthorized scheduled targets.
- No spam sending.
- Email provider is not connected yet; queue only.
- Email language must include limitations.
