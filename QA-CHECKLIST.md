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
- Scan result shows advanced navigation buttons
- Normal report page shows advanced navigation buttons
- Advanced report page opens: `/report/<scan-id>/advanced`
- Inbuilt customer audit page opens: `/report/<scan-id>/inbuilt`
- Vulnerability intelligence page opens: `/report/<scan-id>/vulnerability-intelligence`
- Evidence calibration page opens: `/report/<scan-id>/evidence-calibration`
- Developer fix roadmap opens: `/report/<scan-id>/fix-roadmap`
- Ownership verification public page loads: `/ownership-verification`
- Website verification page opens: `/websites/<website-id>/verify`
- Unverified website shows deep scan locked
- Verified website unlocks authorized deep scan
- Deep scan creates a new scan report
- PDF download works
- Printable report works
- Admin page opens only for admin
- Admin security intelligence opens: `/admin/security-intelligence`
- Admin vulnerability intelligence opens: `/admin/vulnerability-intelligence`
- Audit framework page loads: `/audit-framework`
- Legal pages load
- Trust page loads
- Robots and sitemap work
- Health check returns `status: ok`

## Advanced SaaS checks

- Evidence calibration shows confirmed/probable/manual-review labels
- False-positive risk is visible
- Report quality score is visible
- Safe customer claims are visible
- Blocked claims are visible
- Every strong claim has evidence
- Potential findings do not look like confirmed exploit findings
- No unsafe exploit claims are made
- No aggressive scanning is added before written authorization
