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
- Report page opens
- Advanced report page opens: `/report/<scan-id>/advanced`
- PDF download works
- Printable report works
- Admin page opens only for admin
- Admin security intelligence opens: `/admin/security-intelligence`
- Audit framework page loads: `/audit-framework`
- Legal pages load
- Trust page loads
- Robots and sitemap work
- Health check returns `status: ok`

## Advanced SaaS checks

- Every scan creates an advanced audit object inside report JSON
- OWASP-style controls are visible
- ASVS-style controls are visible
- Evidence records are generated
- Maturity score is generated
- Limitations clearly say it is not a full penetration test
- No unsafe exploit claims are made
- No aggressive scanning is added before written authorization
