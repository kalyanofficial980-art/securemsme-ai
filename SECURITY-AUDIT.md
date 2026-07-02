# SecureMSME AI Security Audit Notes

## Mega Part 70: GitHub / Dependency / Secrets Scanner

Added:

- Repository security projects
- Package.json/manual dependency scanner
- SBOM-lite dependency items
- Masked secret scanner
- Repository security alerts
- Admin observability

## Safety model

The scanner:

- masks secret values
- stores masked evidence only
- gives safe developer remediation
- requires authorization confirmation
- does not clone private repos
- does not access GitHub APIs yet
- does not claim complete coverage

## Required before external repo integration

Before adding real GitHub integration:

- OAuth app review
- scoped repo permissions
- secure token storage
- webhook signature verification
- rate limiting
- audit logging
- repo allowlist/authorization proof
- secret suppression and false-positive workflow
