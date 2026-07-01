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
- Inbuilt customer audit page opens: `/report/<scan-id>/inbuilt`
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

- Customer does not need Docker
- Customer does not need external JSON import
- Customer only needs add website + click scan
- Every normal scan creates inbuilt advanced audit object
- Inbuilt audit evidence records are visible
- Inbuilt audit modules are visible
- Priority fixes are visible
- OWASP-style controls are visible
- ASVS-style controls are visible
- Maturity score is generated
- Limitations clearly say it is not a full penetration test
- No unsafe exploit claims are made
- No aggressive scanning is added before written authorization
