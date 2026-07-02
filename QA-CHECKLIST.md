# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 59 QA: Authenticated Safe Review v2

Database:

- Run `supabase/mega-part-59-authenticated-safe-review-v2.sql`
- Confirm tables:
  - `authenticated_review_contexts`
  - `authenticated_safe_review_runs`
  - `authenticated_page_observations`
  - `authenticated_role_comparisons`
  - `authenticated_review_checklist_items`
  - `authenticated_review_events`

Public:

- `/authenticated-safe-review` opens.

Logged-in report workflow:

- Open `/report/[scan-id]/authenticated-safe-review`.
- Create authenticated review context.
- Confirm no passwords/secrets are entered.
- Authorization checkbox is required.
- Create safe review run.
- Add page observation.
- Add role comparison.
- Update checklist.
- Coverage and auth risk scores update.
- Events appear.

Admin:

- `/admin/authenticated-safe-review` requires admin.
- Admin can view contexts and runs.

Safety:

- No password storage.
- No session cookie storage.
- No brute force.
- No login bypass.
- No exploit payloads.
- No form mutation.
- No private data extraction.
- No payment/order actions.
