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
- Monitoring public page opens: `/monitoring-worker`
- Monitoring report page opens: `/report/<scan-id>/monitoring`
- Enable/update monitoring works
- Run monitoring evaluation works
- Monitoring job active card appears
- Score before/current/delta appears
- Drift status appears
- Regression reasons appear when score drops/risk increases
- Monitoring events are saved
- Can claim / Cannot claim appears
- Admin monitoring page opens only for admin: `/admin/monitoring`
- Report truth cleanup public page opens: `/report-truth-cleanup`
- Score consistency page opens: `/scan-consistency`
- Health check returns `status: ok`

## Monitoring safety checks

Allowed:

- Compare saved scan snapshots
- Detect score drift
- Detect risk increase
- Create monitoring events
- Mark regression signals for review
- Track latest baseline

Blocked:

- Do not claim full continuous pentest yet
- Do not claim all vulnerabilities are monitored
- Do not claim exploit/compromise from score drift alone
- Do not run destructive checks
- Do not hide old scan history
