# SecureMSME AI Security Audit Notes

## Current product direction

SecureMSME AI is not a basic manual freelance testing checklist. It is being built as an automated, repeatable, evidence-based cybersecurity SaaS for MSMEs.

## Current audit depth

### Automated passive checks

Allowed:

- HTTPS and TLS posture
- SSL certificate expiry
- HTTP to HTTPS redirect
- HSTS
- Security headers
- Server fingerprint reduction signals
- Email security DNS checks
- Public trust pages
- robots.txt
- sitemap.xml
- security.txt
- Common sensitive public file indicators
- Cookie security signals where visible
- Advanced report mapping to OWASP-style and ASVS-style categories
- Evidence records and business recommendations

### Not allowed in current safe SaaS mode

Not allowed:

- Exploitation
- Brute force
- Login bypass
- Password guessing
- Unauthorized private testing
- Aggressive scanning
- Destructive testing

## Advanced audit layers

1. Public security posture
2. Trust and compliance signals
3. OWASP-style risk mapping
4. ASVS-style control mapping
5. Evidence records
6. Security maturity score
7. Executive actions
8. Safe testing limitations
9. Next audit depth roadmap

## Pre-deploy security gate

Run:

```powershell
npm.cmd run audit:app
npm.cmd run e2e
npm.cmd run audit:npm
```

Do not run:

```powershell
npm audit fix --force
```

unless you are ready to manually test every breaking dependency update.

## Future advanced connector

Later, add safe ZAP Baseline passive connector only for authorized customer-owned websites.
