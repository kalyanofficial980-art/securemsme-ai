# Rollback and Backup Checklist

Use this before and during private pilot.

## Stable version

- Product: SecureMSME AI
- Stable tag: v1.0-final-launch-hardening
- E2E gate: 170 passed
- Status: private pilot technical gate passed

## Before pilot

Check:

- Git status clean
- Latest stable tag exists
- Vercel deployment is live
- Login works
- Pricing page works
- Support page works
- Scan authorization page works
- Security.txt works
- Terms/privacy/refund pages work
- Manual billing process is documented

## Emergency rollback commands

Use only if production breaks after a future change.

Run:

cd C:\Users\ADMIN\securemsme-ai
git status
git fetch --all --tags
git checkout v1.0-final-launch-hardening
npm.cmd install
npm.cmd run build
npx.cmd playwright test --workers=1

## Normal backup before future changes

Run:

cd C:\Users\ADMIN\securemsme-ai
git status
git log --oneline -5
git tag --list "v1*"

## Pilot incident response

If a customer reports an issue:

1. Stop scanning that customer website.
2. Save screenshot/logs.
3. Check whether the website was authorized.
4. Check whether any unsafe action happened.
5. Respond politely.
6. Do not blame customer.
7. Do not claim breach unless confirmed.
8. Fix product/report language if needed.
9. Retest only after permission.

## Data safety rules

Do not store or ask for:

- Passwords
- OTPs
- Private keys
- API tokens
- Card details
- UPI PINs
- Bank passwords
- Production database credentials

## Report safety rules

Use cautious wording:

- Observed risk
- Potential issue
- Needs manual review
- Evidence suggests
- Recommended fix
- Retest after fix
