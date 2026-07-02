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
- Attack surface public page opens: `/attack-surface-discovery`
- Attack surface report page opens: `/report/<scan-id>/attack-surface`
- Attack surface page is locked if website is not verified
- Attack surface run requires authorization checkbox
- Attack surface inventory saves route count
- Attack surface inventory saves API endpoint count
- Attack surface inventory saves form/input count
- Attack surface inventory saves parameter count
- Attack surface inventory saves JS route count
- Attack surface inventory saves blocked route count
- Attack surface items are visible
- Normalized evidence is created for attack surface discovery
- Vulnerability lifecycle seeds are created for API/form/risk signals
- Admin attack surface page opens only for admin: `/admin/attack-surface`
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

## Advanced crawler safety checks

Allowed:

- Same-origin GET/HEAD crawling
- Link discovery
- JavaScript route extraction
- API path signal discovery
- Form/input inventory without submission
- URL parameter inventory
- Script inventory
- Metadata-only evidence

Blocked:

- Unverified targets
- Localhost/private/internal targets
- Cross-origin crawling
- Form submission
- POST/PUT/PATCH/DELETE
- Login attempt
- Brute force
- Exploit payloads
- Payment/order mutation
- Private body storage
- Credential/session storage
