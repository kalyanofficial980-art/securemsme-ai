# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 70 QA: GitHub / Dependency / Secrets Scanner

Database:

- Run `supabase/mega-part-70-repo-dependency-secrets-scanner.sql`
- Confirm tables:
  - `repo_security_projects_v2`
  - `repo_dependency_scan_runs_v2`
  - `repo_dependency_items_v2`
  - `repo_secret_scan_runs_v2`
  - `repo_secret_findings_v2`
  - `repo_security_alerts_v2`
  - `repo_security_events_v2`

Pages:

- `/repo-security`
- `/report/[scan-id]/repo-security`
- `/admin/repo-security`

Workflow:

1. Login.
2. Open `/repo-security`.
3. Create repository project with authorization confirmation.
4. Paste package.json dependency data.
5. Paste safe test env text with fake token-like value.
6. Run repo security scan.
7. Confirm dependency run appears.
8. Confirm secret findings are masked only.
9. Update secret finding status.
10. Admin opens `/admin/repo-security`.

Safety:

- No raw secret exposure.
- No private repo cloning.
- No exploit payloads.
- No bypass instructions.
- No claim that all secrets were found.
- No claim that all vulnerabilities were found.
- Dependency checks are heuristic until live advisory database integration.
