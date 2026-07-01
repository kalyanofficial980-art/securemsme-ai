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
- Retest proof public page opens: `/retest-proof`
- Retest proof report page opens: `/report/<scan-id>/retest-proof`
- Retest proof shows previous scan selector
- Retest proof requires a previous scan for same website
- Retest proof generates before/after comparison
- Retest proof shows score change
- Retest proof shows fixed items
- Retest proof shows improved items
- Retest proof shows still-open items
- Retest proof shows new issues
- Retest proof shows can/cannot claim boundary
- Retest proof saves history in `retest_proof_reports`
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

## Retest proof safety checks

Allowed:

- Compare previously stored evidence
- Compare score before/after
- Mark observed fixed/improved/still-open/new items
- Generate developer next actions
- Generate customer-safe proof statements

Blocked:

- Claiming every vulnerability was fixed
- Claiming website is 100% secure
- Claiming full pentest coverage
- Claiming no vulnerabilities remain
