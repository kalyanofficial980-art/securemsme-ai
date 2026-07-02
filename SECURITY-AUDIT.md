# SecureMSME AI Security Audit Notes

## Mega Part 40 GraphQL Risk Analyzer

Added:

- `graphql_security_inventories`
- `graphql_security_findings`
- GraphQL risk analyzer engine
- GraphQL endpoint discovery
- GraphQL IDE/playground exposure signal review
- Introspection review signals without introspection execution
- Query/mutation surface signal classification
- Sensitive schema keyword signal review
- GraphQL auth-boundary review guidance
- API Top 10 mapping for GraphQL
- Metadata-only normalized evidence output
- Vulnerability lifecycle seeds
- Customer GraphQL risk page
- Admin GraphQL risk observability page
- Public GraphQL risk analyzer page
- Unit tests and E2E page coverage

## What this part does

- Checks likely GraphQL endpoint paths using GET metadata-only observation.
- Imports endpoint hints from attack surface and API inventory.
- Detects GraphQL IDE/playground, introspection keyword, mutation keyword and sensitive keyword signals.
- Maps GraphQL risk signals to OWASP API Top 10.
- Writes normalized evidence and vulnerability lifecycle seeds.

## What this part does not do

- It does not execute GraphQL queries.
- It does not execute introspection queries.
- It does not execute mutations.
- It does not dump schema.
- It does not attempt authorization bypass.
- It does not brute force fields or operations.
- It does not store private response bodies.
- It does not run exploit payloads.

## Next layer

Mega Part 41 should add:

- Authenticated Session-Safe Crawler Execution
- Test-account session plan enforcement
- Allowed/blocked route controls
- No mutation requests
- Metadata-only authenticated route inventory
- Private evidence protection
