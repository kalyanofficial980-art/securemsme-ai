# SecureMSME AI QA Checklist

Run this before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Vulnerability Scanner + Bug Finder QA

- `/vulnerability-scanner` public info page opens.
- `/report/<scan-id>/vulnerability-scanner` opens for logged-in scan owner.
- Scanner blocks if permission checkbox is not accepted.
- Scanner blocks localhost/private/internal targets.
- Safe light/standard/deep mode can be selected.
- Scanner run saves to `vulnerability_scanner_runs`.
- Bug findings save to `vulnerability_bug_findings`.
- Findings show:
  - severity
  - confidence
  - false-positive risk
  - evidence
  - customer data risk
  - business impact
  - developer fix
  - retest steps
  - safe claim
  - blocked claim
- Lifecycle status can be updated.
- Admin page `/admin/vulnerability-scanner` opens only for admin.
- E2E passes.
- Build passes on Vercel.

## Safety checks

Allowed:

- authorized public website checks
- GET/HEAD only
- security headers
- cookie flags
- trust pages
- public admin/API surface signals
- HEAD-only sensitive path status checks
- developer fix guidance

Blocked:

- brute force
- password guessing
- login bypass
- exploit payloads
- SQLi/XSS exploitation
- private data extraction
- form submission
- destructive testing
- payment/order mutation
