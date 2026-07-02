# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 55 QA: Scan Orchestrator v2 + Engine Execution Pipeline

Database:

- Run `supabase/mega-part-55-scan-orchestrator-v2.sql`
- Confirm tables:
  - `scan_engine_registry`
  - `scan_orchestrator_jobs`
  - `scan_orchestrator_engine_runs`
  - `scan_orchestrator_events`

Public:

- `/scan-orchestrator` opens.

Logged-in report workflow:

- Open `/report/[scan-id]/scan-orchestrator`
- Create pipeline:
  - Safe Light
  - Safe Standard
  - Safe Deep
  - Authenticated Safe
- Authorization checkbox is required.
- Engine runs are created.
- `Run next engine` works.
- `Run all queued engines` works.
- Coverage percentage updates.
- Weighted coverage percentage updates.
- Engine events appear.
- Retry warnings button does not break.

Admin:

- `/admin/scan-orchestrator` requires admin.
- Admin can view recent pipelines and engine runs.

Safety:

- Pipeline is authorized-scope only.
- Engine metadata lists safe methods.
- Blocked actions are visible.
- No exploit payloads are executed.
- No brute force.
- No login bypass.
- No destructive testing.
