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
- International security engine public page opens: `/international-security-engine`
- International security engine report page opens: `/report/<scan-id>/security-engine`
- International security engine can create a job
- Engine job saves selected modules
- Engine job saves blocked modules
- Engine job saves coverage matrix
- Engine job saves standards summary
- Engine job saves normalized evidence
- Engine job saves vulnerability lifecycle seeds
- Engine events are visible
- Admin engine observability page opens only for admin: `/admin/security-engine`
- Authenticated scan public page opens: `/authenticated-scan`
- Authenticated scan report page opens: `/report/<scan-id>/authenticated-scan`
- Retest proof public page opens: `/retest-proof`
- Retest proof report page opens: `/report/<scan-id>/retest-proof`
- CMS/WordPress scanner public page opens: `/cms-wordpress-scanner`
- CMS/WordPress report page opens: `/report/<scan-id>/cms-wordpress`
- Real safe templates public page opens: `/real-safe-templates`
- Real safe template report page opens: `/report/<scan-id>/real-template-worker`
- Real security checks public page opens: `/real-security-checks`
- Real modules report page opens: `/report/<scan-id>/real-modules`
- Authorized security review public page opens: `/authorized-pentest`
- Known technology risks page opens: `/report/<scan-id>/known-risks`
- Customer value page opens: `/report/<scan-id>/customer-value`
- Evidence confidence page opens: `/report/<scan-id>/evidence-calibration`
- Developer instructions page opens: `/report/<scan-id>/fix-roadmap`
- Ownership verification public page loads: `/ownership-verification`
- Website verification page opens: `/websites/<website-id>/verify`
- PDF download works
- Printable report works
- Admin page opens only for admin
- Legal pages load
- Trust page loads
- Robots and sitemap work
- Health check returns `status: ok`

## International security engine safety checks

Allowed:

- Job planning
- Module selection
- Coverage calculation
- Normalized evidence creation
- Vulnerability lifecycle seed creation
- Standards mapping
- Public-safe module planning
- Verified-scope module planning after permission

Blocked:

- Unauthorized scanning
- Brute force
- Password guessing
- Login bypass
- MFA bypass
- Data extraction
- Payment/order mutation
- Destructive exploit execution
- DoS testing
- Malware payloads
- Private data storage
