# SecureMSME AI QA Checklist

Run this before every deployment.

## Automated checks

```powershell
npm.cmd run audit:app
npm.cmd run e2e
npm.cmd run audit:npm
```

## Manual product checks

- Signup works
- Login works
- Dashboard opens after login
- Add website works
- Manual scan works
- Saved website rescan works
- Customer report hub opens: `/report/<scan-id>/security-hub`
- Background worker public page opens: `/background-worker`
- Worker queue report page opens: `/report/<scan-id>/queue`
- Admin worker queue page opens only for admin: `/admin/worker-queue`
- Queue page asks for monitoring if monitoring is not enabled
- Enqueue monitoring worker job works after monitoring is enabled
- Run next due worker job works
- Job status changes queued -> running -> completed
- Worker attempt is saved
- Worker events are saved
- Monitoring run is created by worker execution
- Retry/failure fields are visible
- Cancel queued/retry job works
- Monitoring public page opens: `/monitoring-worker`
- Report truth cleanup public page opens: `/report-truth-cleanup`
- Scan consistency public page opens: `/scan-consistency`
- Access-control public page opens: `/access-control-signal-engine`
- Authenticated crawler public page opens: `/authenticated-crawler`
- GraphQL risk public page opens: `/graphql-risk-analyzer`
- Browser security public page opens: `/browser-security-analyzer`
- API scanner public page opens: `/api-security-scanner`
- Attack surface public page opens: `/attack-surface-discovery`
- International security engine public page opens: `/international-security-engine`
- Authenticated scan public page opens: `/authenticated-scan`
- Retest proof public page opens: `/retest-proof`
- CMS/WordPress scanner public page opens: `/cms-wordpress-scanner`
- Real security checks public page opens: `/real-security-checks`
- Known technology risks page opens: `/report/<scan-id>/known-risks`
- PDF download works
- Printable report works
- Legal pages load
- Trust page loads
- Health check returns `status: ok`

## Worker safety checks

Allowed:

- Queue internal jobs
- Lock one due job
- Store attempts and events
- Retry failed jobs up to limit
- Execute monitoring-evaluation job
- Create monitoring run from worker

Blocked:

- Do not call it automatic cron yet
- Do not run destructive checks
- Do not execute unsupported job types as real work
- Do not store secrets/sessions
- Do not claim full continuous pentest
