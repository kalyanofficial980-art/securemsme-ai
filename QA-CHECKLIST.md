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
- Scan result shows customer-friendly advanced navigation
- Normal report page shows customer-friendly advanced navigation
- Customer report hub opens: `/report/<scan-id>/security-hub`
- Customer report hub avoids words like Nuclei, ZAP, tool runner, job logs
- Customer report hub shows score, risk, priority fixes, report boundary, next steps
- Customer value page opens: `/report/<scan-id>/customer-value`
- Customer value page can create/refresh fix workflow
- Fix item status can be changed to open/in progress/fixed/needs review/accepted risk
- Customer value report shows before/after score comparison
- Customer value report shows proof-of-fix summary
- Public `/tools` page uses business language
- Public `/safe-templates` page uses business language
- Public `/passive-worker` page uses business language
- Internal engine page opens only for admin: `/admin/internal-engines`
- Tool runner details are admin-only
- Safe advanced checks report opens: `/report/<scan-id>/safe-templates`
- Website review evidence report opens: `/report/<scan-id>/passive-worker`
- Evidence confidence page opens: `/report/<scan-id>/evidence-calibration`
- Developer instructions page opens: `/report/<scan-id>/fix-roadmap`
- Ownership verification public page loads: `/ownership-verification`
- Website verification page opens: `/websites/<website-id>/verify`
- Unverified website shows deep scan locked
- Verified website unlocks authorized deep scan
- Deep scan creates a new scan report
- PDF download works
- Printable report works
- Admin page opens only for admin
- Audit framework page loads: `/audit-framework`
- Legal pages load
- Trust page loads
- Robots and sitemap work
- Health check returns `status: ok`

## Customer-facing wording checks

Avoid these words in main customer flow:

- Nuclei
- ZAP
- tool runner
- worker
- architecture-ready
- normalized evidence
- job logs
- exploit template

Use these words instead:

- Advanced website checks
- Website review evidence
- Evidence confidence
- Developer instructions
- Fix plan
- Proof after fix
- Safety controls
