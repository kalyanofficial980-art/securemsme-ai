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
- Real security checks public page opens: `/real-security-checks`
- Real modules report page opens: `/report/<scan-id>/real-modules`
- Real modules are locked if website is not verified
- Real modules require authorization checkbox
- Real modules run only after verified scope and permission
- Real modules show HTTP/TLS/DNS/service evidence
- Real modules block private/internal targets
- Real module results are saved in authorized module results table
- Admin real module page opens only for admin: `/admin/real-modules`
- Authorized security review public page opens: `/authorized-pentest`
- Authorized security review report page opens: `/report/<scan-id>/authorized-pentest`
- Known technology risks page opens: `/report/<scan-id>/known-risks`
- Customer value page opens: `/report/<scan-id>/customer-value`
- Evidence confidence page opens: `/report/<scan-id>/evidence-calibration`
- Developer instructions page opens: `/report/<scan-id>/fix-roadmap`
- Public `/tools` page uses business language
- Public `/safe-templates` page uses business language
- Public `/passive-worker` page uses business language
- Ownership verification public page loads: `/ownership-verification`
- Website verification page opens: `/websites/<website-id>/verify`
- PDF download works
- Printable report works
- Admin page opens only for admin
- Legal pages load
- Trust page loads
- Robots and sitemap work
- Health check returns `status: ok`

## Real module safety checks

Allowed:

- HTTP GET request
- TLS handshake
- DNS queries
- Low-rate TCP connect checks
- Public verified targets only

Blocked:

- Localhost
- Private IP
- Internal hostname
- Brute force
- Exploit payload
- Login bypass
- Form submission
- Destructive test
- Private data collection
