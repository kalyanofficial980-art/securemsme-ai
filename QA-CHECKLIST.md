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
- CMS/WordPress scanner public page opens: `/cms-wordpress-scanner`
- CMS/WordPress report page opens: `/report/<scan-id>/cms-wordpress`
- CMS/WordPress scanner is locked if website is not verified
- CMS/WordPress scanner requires authorization checkbox
- CMS/WordPress scanner runs only after verified scope and permission
- CMS/WordPress scanner shows WordPress/WooCommerce status
- CMS/WordPress scanner shows plugin/theme/version signals
- CMS/WordPress scanner shows findings and observations
- User endpoint bodies are not stored
- XML-RPC POST is not used
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

## CMS/WordPress scanner safety checks

Allowed:

- GET requests
- HEAD requests
- Public verified targets only
- WordPress REST signal review
- Login/admin status review
- XML-RPC HEAD-only status
- Plugin/theme public asset signal detection
- WooCommerce/storefront public signal detection

Blocked:

- Localhost
- Private IP
- Internal hostname
- Password guessing
- Brute force
- Login bypass
- XML-RPC POST
- Exploit payload
- Form submission
- Destructive test
- Private data collection
- User endpoint body storage
