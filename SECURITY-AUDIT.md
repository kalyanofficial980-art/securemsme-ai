# SecureMSME AI Security Audit Notes

## Current product direction

SecureMSME AI is becoming a cyber trust and vulnerability intelligence platform for MSME websites.

## Mega Part 22 authorization layer

Added:

- DNS TXT ownership verification
- HTML file ownership verification
- Meta tag ownership verification
- Permission attestation checkbox
- Deep scan locked until verification
- Authorized deep scan endpoint
- Deep scan report stores authorization metadata

## Customer-side product rule

Customer should only do:

1. Add website
2. Verify ownership/permission
3. Run authorized deep scan
4. Read advanced audit + vulnerability intelligence report
5. Fix priority issues
6. Rescan and monitor

## Not allowed in current safe SaaS mode

Not allowed:

- Exploitation
- Brute force
- Login bypass
- Password guessing
- Unauthorized private testing
- Aggressive scanning
- Destructive testing
- Private data access

## Next international-standard layer

Mega Part 23 should add:

- Asset inventory
- Subdomain discovery from safe DNS/Certificate Transparency sources
- Technology monitoring history
- Risk regression alerts

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
