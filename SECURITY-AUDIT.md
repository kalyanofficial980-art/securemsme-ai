# SecureMSME AI Security Audit Notes

## Mega Part 37 Advanced Crawler + Attack Surface Discovery Engine

Added:

- `attack_surface_inventories`
- `attack_surface_items`
- Advanced crawler engine
- Same-origin route discovery
- JavaScript/SPA route extraction
- API endpoint signal discovery
- Form and input inventory
- URL parameter inventory
- Script and external link inventory
- Blocked route policy
- Normalized evidence output
- Vulnerability lifecycle seeds
- Customer attack surface page
- Admin attack surface observability page
- Public attack surface discovery page
- Unit tests and E2E page coverage

## What this part does

- Executes a safe crawler only after verified scope and permission.
- Uses GET only for page fetches.
- Does not submit forms.
- Does not use POST/PUT/PATCH/DELETE.
- Does not store private page bodies.
- Stores attack surface metadata and risk signals.
- Writes normalized evidence and vulnerability lifecycle seeds into Part 36 tables.

## What this part does not do

- It does not exploit vulnerabilities.
- It does not test injection payloads.
- It does not test authentication bypass.
- It does not brute force.
- It does not mutate data.
- It does not complete checkout or payment.
- It does not store credentials, cookies, sessions, or private data.

## Next layer

Mega Part 38 should add:

- API Discovery + OpenAPI Security Scanner
- Parse OpenAPI/Swagger documents safely
- REST endpoint inventory
- API method risk classification
- Auth boundary metadata
- Rate-limit signal checks
- Sensitive response metadata guard
