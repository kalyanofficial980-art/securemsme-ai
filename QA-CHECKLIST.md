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
- Developer fix roadmap opens: `/report/<scan-id>/fix-roadmap`
- Public vulnerability intelligence page loads: `/vulnerability-intelligence`
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

- Advanced value is visible immediately after scan
- Customer does not need hidden URLs
- Developer roadmap is easy to share with developer
- Vulnerability intelligence is the primary advanced CTA
- No unsafe exploit claims are made
- No aggressive scanning is added before written authorization
