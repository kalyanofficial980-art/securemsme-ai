# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 53 QA: Security Review Workspace + Bug Lifecycle Dashboard

Database:

- Run `supabase/mega-part-53-security-review-workspace.sql`
- Confirm tables:
  - `security_review_workspaces`
  - `security_review_bug_items`
  - `security_review_activity_events`

Public:

- `/security-review-workspace` opens.
- `/reviews` redirects to login when logged out.
- `/admin/security-review-workspaces` requires admin.

Logged-in workflow:

- `/reviews` opens.
- Manual workspace can be created.
- `/reviews/[id]` opens.
- Manual bug/risk item can be added.
- Bug lifecycle can be changed:
  - Open
  - In Progress
  - Fixed by Developer
  - Needs Retest
  - Verified Fixed
  - Accepted Risk
  - False Positive
- Workspace progress and counts update.
- Workspace summaries can be edited.
- Activity timeline records important actions.

Scan-linked workflow:

- Open any scan report.
- Open `/report/[scan-id]/security-review-workspace`.
- Create workspace from scan.
- Run Vulnerability Scanner first.
- Click "Sync latest scanner findings".
- Scanner findings appear in lifecycle dashboard.

Safety:

- Workspace is workflow-only.
- It does not perform exploit testing.
- It tracks evidence, developer fixes and retest status.
