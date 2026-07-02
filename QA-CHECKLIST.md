# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 63 QA: Retest + Client Portal Pro

Database:

- Run `supabase/mega-part-63-retest-client-portal-pro.sql`
- Confirm tables:
  - `retest_runs_v2`
  - `retest_items_v2`
  - `client_portal_pro_links_v2`
  - `client_portal_pro_sections_v2`
  - `retest_client_portal_events_v2`

Public:

- `/retest-client-portal-pro` opens.

Logged-in workflow:

- Open `/report/[scan-id]/retest-client-portal-pro`.
- Create safe retest run.
- Update one retest item as passed with safe proof note.
- Generate Client Portal Pro link.
- Open `/client-portal-pro/[token]`.
- Confirm executive summary, fix progress, retest proof and limitations are visible.

Admin:

- `/admin/retest-client-portal-pro` requires admin.
- Admin can view retest runs and Client Portal Pro links.

Safety:

- No exploit payloads.
- No destructive testing.
- No brute force.
- No password/token/session exposure.
- No private customer data.
- No 100% secure claim.
- No legal compliance certificate claim.
