# SecureMSME AI QA Checklist

Run this before every deployment.

## Automated checks

```powershell
npm.cmd run audit:app
npm.cmd run e2e
npm.cmd run audit:npm
```

## Manual product checks

- Signup works
- Login works
- Dashboard opens after login
- Add website works
- Manual scan works
- Saved website rescan works
- Customer report hub opens: `/report/<scan-id>/security-hub`
- GraphQL risk public page opens: `/graphql-risk-analyzer`
- GraphQL risk report page opens: `/report/<scan-id>/graphql-risk`
- GraphQL risk page is locked if website is not verified
- GraphQL risk run requires authorization checkbox
- GraphQL risk score is visible
- GraphQL endpoint observations are saved
- GraphQL IDE/playground signals are saved
- GraphQL introspection review signals are saved
- GraphQL sensitive keyword signals are saved
- GraphQL mutation signals are saved
- GraphQL findings are stored
- GraphQL analyzer creates normalized evidence
- GraphQL analyzer creates vulnerability lifecycle seeds
- Admin GraphQL page opens only for admin: `/admin/graphql-risk`
- Browser security public page opens: `/browser-security-analyzer`
- Browser security report page opens: `/report/<scan-id>/browser-security`
- API scanner public page opens: `/api-security-scanner`
- API scanner report page opens: `/report/<scan-id>/api-security`
- Attack surface public page opens: `/attack-surface-discovery`
- Attack surface report page opens: `/report/<scan-id>/attack-surface`
- International security engine public page opens: `/international-security-engine`
- International security engine report page opens: `/report/<scan-id>/security-engine`
- Authenticated scan public page opens: `/authenticated-scan`
- Retest proof public page opens: `/retest-proof`
- CMS/WordPress scanner public page opens: `/cms-wordpress-scanner`
- Real security checks public page opens: `/real-security-checks`
- Known technology risks page opens: `/report/<scan-id>/known-risks`
- PDF download works
- Printable report works
- Legal pages load
- Trust page loads
- Health check returns `status: ok`

## GraphQL safety checks

Allowed:

- GET/HEAD metadata-only GraphQL discovery
- GraphQL endpoint candidate review
- IDE/playground signal review
- Introspection keyword/signal review without executing introspection
- Mutation keyword/signal review without executing mutations
- Sensitive schema keyword metadata review
- API Top 10 mapping
- Normalized evidence output

Blocked:

- Unverified targets
- Localhost/private/internal targets
- GraphQL query execution
- Introspection query execution
- Mutation execution
- Schema dumping
- Brute force
- Exploit payloads
- Private response body storage
- Credential/session storage
