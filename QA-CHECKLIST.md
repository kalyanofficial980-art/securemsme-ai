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
- Scan consistency public page opens: `/scan-consistency`
- Scan consistency report page opens: `/report/<scan-id>/scan-consistency`
- Score explanation can be generated
- Current score is shown
- Previous score is shown when history exists
- Score delta is shown
- Risk transition is shown
- Latest scan badge is shown
- Why this score section is shown
- Why score changed section is shown
- Can claim / Cannot claim section is shown
- Consistency warnings are shown for large changes
- Admin scan consistency page opens only for admin: `/admin/scan-consistency`
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

## Trust safety checks

Allowed:

- Explain current scan score
- Compare latest scan with previous scan
- Show score delta
- Show engine version
- Explain why old and new scores may differ
- Say latest scan is current baseline
- Say old scans are history

Blocked:

- Do not claim 100% vulnerability detection
- Do not claim website is fully safe
- Do not claim full pentest
- Do not claim compliance certification
- Do not hide score inconsistency
