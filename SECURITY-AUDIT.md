# SecureMSME AI Security Audit Notes

## Current safety model

SecureMSME AI performs safe public checks only.

Allowed:
- HTTPS check
- SSL expiry check
- Security headers
- Email security DNS checks
- Public policy pages
- robots.txt / sitemap.xml / security.txt
- Common public exposure indicators

Not allowed:
- Exploitation
- Brute force
- Login bypass
- Password guessing
- Unauthorized private testing
- Aggressive scanning

## Pre-deploy security gate

Run:

```powershell
npm.cmd run audit:npm
npm.cmd run build
npm.cmd run test
npm.cmd run e2e
```

Do not run:

```powershell
npm audit fix --force
```

unless you are ready to manually test every breaking dependency update.
