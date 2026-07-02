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
- Report truth cleanup public page opens: `/report-truth-cleanup`
- Report truth cleanup report page opens: `/report/<scan-id>/truth-cleanup`
- Generate truth cleanup works
- Truth score is shown
- Fake-looking risk is shown
- Generic text count is shown
- Missing evidence count is shown
- Cleaned fixes are shown
- Each cleaned fix has evidence summary
- Each cleaned fix has why it matters
- Each cleaned fix has exact developer fix
- Each cleaned fix has validation steps
- Each cleaned fix has cannot-claim wording
- Truth warnings are shown
- Safe claims and blocked claims are shown
- Admin truth page opens only for admin: `/admin/report-truth`
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

## Truth safety checks

Allowed:

- Detect generic old wording
- Replace generic fixes with specific developer guidance
- Mark weak evidence as needs-review
- Add validation steps
- Add safe customer wording
- Add cannot-claim guardrails
- Explain old development reports were weaker

Blocked:

- Do not invent vulnerabilities
- Do not claim exploitability without proof
- Do not claim 100% secure
- Do not claim full pentest
- Do not claim compliance certificate
- Do not share old generic reports as final customer reports
