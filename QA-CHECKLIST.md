# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 60 QA: API Security Review v2

Database:

- Run `supabase/mega-part-60-api-security-review-v2.sql`
- Confirm tables:
  - `api_security_review_runs_v2`
  - `api_discovered_specs_v2`
  - `api_endpoint_inventory_v2`
  - `api_security_observations_v2`
  - `api_review_checklist_items_v2`
  - `api_security_review_events_v2`

Public:

- `/api-security-review` opens.

Logged-in report workflow:

- Open `/report/[scan-id]/api-security-review`.
- Select Safe Light / Safe Standard / Safe Deep.
- Tick authorization checkbox.
- Run API review.
- Confirm API docs/specs appear if public docs exist.
- Confirm endpoints appear if OpenAPI JSON/YAML is parsed.
- Add manual endpoint if API docs are private.
- Confirm API observations appear.
- Update checklist.
- Scores update:
  - API coverage score
  - API risk score

Admin:

- `/admin/api-security-review` requires admin.
- Admin can view API runs and endpoint inventory.

Safety:

- GET discovery only.
- No POST/PUT/PATCH/DELETE execution.
- No fuzzing.
- No exploit payloads.
- No auth bypass.
- No brute force.
- No private data extraction.
- No payment/order mutations.
