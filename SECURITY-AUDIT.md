# SecureMSME AI Security Audit Notes

## Current product direction

SecureMSME AI is becoming a cyber trust and vulnerability intelligence platform for MSME websites.

## Customer-side product rule

Customer should only do:

1. Add website
2. Click scan
3. Read advanced audit + vulnerability intelligence report
4. Fix priority issues
5. Rescan and monitor

## Current inbuilt vulnerability intelligence

Added in Mega Part 21:

- Technology fingerprinting
- CMS detection
- Framework detection
- Ecommerce platform signals
- Hosting/server signals
- Version exposure detection
- Attack surface inventory
- API/docs/admin/debug/config/backup surface checks
- External script supply-chain surface
- Confidence labels
- Confirmed vs likely vs manual-validation-needed status
- Customer impact and technical explanation
- Safe testing boundary on every report

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

Mega Part 22 should add ownership verification:

- DNS TXT verification
- HTML file verification
- Meta tag verification
- Permission statement
- Deeper scan unlock only after verification

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
