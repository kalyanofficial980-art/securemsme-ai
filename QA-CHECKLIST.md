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
- Real safe templates public page opens: `/real-safe-templates`
- Real safe template report page opens: `/report/<scan-id>/real-template-worker`
- Real safe templates are locked if website is not verified
- Real safe templates require authorization checkbox
- Real safe templates run only after verified scope and permission
- Real safe templates show path observations
- Real safe templates show template findings
- Sensitive-path body storage is blocked
- Real safe template results are saved in authorized module results table
- Real security checks public page opens: `/real-security-checks`
- Real modules report page opens: `/report/<scan-id>/real-modules`
- Real modules are locked if website is not verified
- Real modules show HTTP/TLS/DNS/service evidence
- Authorized security review public page opens: `/authorized-pentest`
- Authorized security review report page opens: `/report/<scan-id>/authorized-pentest`
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

## Real safe template safety checks

Allowed:

- GET requests
- HEAD requests
- Public verified targets only
- Header/status/body pattern matching
- Sensitive HEAD-only checks

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
- Sensitive response body storage
