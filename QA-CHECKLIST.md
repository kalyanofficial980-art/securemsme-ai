# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 62 QA: Developer Portal + Fix Collaboration v2

Database:

- Run `supabase/mega-part-62-developer-portal-fix-collaboration-v2.sql`
- Confirm tables:
  - `developer_fix_portals_v2`
  - `developer_fix_tasks_v2`
  - `developer_fix_comments_v2`
  - `developer_retest_requests_v2`
  - `developer_portal_events_v2`

Public:

- `/developer-portal` opens.

Logged-in report workflow:

- Open `/report/[scan-id]/developer-portal`.
- Create Developer Fix Portal.
- Sync tasks from findings.
- Add manual task.
- Change task status.
- Add safe developer comment.
- Mark task as retest-requested.
- Confirm retest request row is created.
- Confirm progress scores update.

Admin:

- `/admin/developer-portal` requires admin.
- Admin can view portals and tasks.

Safety:

- No passwords.
- No tokens.
- No session cookies.
- No private customer data.
- No exploit payloads.
- No destructive retest steps.
