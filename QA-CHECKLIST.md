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
- Browser security public page opens: `/browser-security-analyzer`
- Browser security report page opens: `/report/<scan-id>/browser-security`
- Browser security page is locked if website is not verified
- Browser security run requires authorization checkbox
- Browser security score is visible
- CSP findings are saved
- CORS findings are saved
- Cookie/session flag findings are saved
- Clickjacking findings are saved
- Mixed content findings are saved
- External script findings are saved
- Browser security findings are stored
- Browser security creates normalized evidence
- Browser security creates vulnerability lifecycle seeds
- Admin browser security page opens only for admin: `/admin/browser-security`
- API scanner public page opens: `/api-security-scanner`
- API scanner report page opens: `/report/<scan-id>/api-security`
- Attack surface public page opens: `/attack-surface-discovery`
- Attack surface report page opens: `/report/<scan-id>/attack-surface`
- International security engine public page opens: `/international-security-engine`
- International security engine report page opens: `/report/<scan-id>/security-engine`
- Authenticated scan public page opens: `/authenticated-scan`
- Retest proof public page opens: `/retest-proof`
- CMS/WordPress scanner public page opens: `/cms-wordpress-scanner`
- Real security checks public page opens: `/real-security-checks`
- Known technology risks page opens: `/report/<scan-id>/known-risks`
- PDF download works
- Printable report works
- Legal pages load
- Trust page loads
- Health check returns `status: ok`

## Browser security safety checks

Allowed:

- GET-only page observation
- Header review
- Cookie attribute review
- CSP/CORS/clickjacking/HSTS/referrer/permissions policy review
- Mixed content signal detection
- External script metadata review
- Normalized evidence output

Blocked:

- Unverified targets
- Localhost/private/internal targets
- Form submission
- POST/PUT/PATCH/DELETE
- Exploit payloads
- Private body storage
- Credential/session storage
- Destructive testing
