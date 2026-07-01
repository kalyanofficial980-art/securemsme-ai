# SecureMSME AI Security Audit Notes

## Current product direction

SecureMSME AI is not a basic manual freelance testing checklist. It is an automated, repeatable, customer-friendly cybersecurity SaaS for MSMEs.

## Customer-side product rule

Customer should not need:

- Docker
- ZAP install
- JSON paste
- External testing-tool setup
- Manual freelancer-style checklist

Customer should only do:

1. Add website
2. Click scan
3. Read advanced audit report
4. Download/share report
5. Monitor improvements

## Current inbuilt audit depth

Allowed inbuilt passive checks:

- HTTPS and TLS posture
- HSTS
- Security headers
- Browser protections
- Server fingerprint signals
- Mixed content detection
- Script surface review
- Public form/session signals
- robots.txt
- sitemap.xml
- security.txt
- Privacy/terms/contact trust signals
- Evidence records
- Priority fixes
- OWASP-style mapping
- ASVS-style mapping
- Security maturity score
- Customer business readiness label

## Not allowed in current safe SaaS mode

Not allowed:

- Exploitation
- Brute force
- Login bypass
- Password guessing
- Unauthorized private testing
- Aggressive scanning
- Destructive testing

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
