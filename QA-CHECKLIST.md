# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 66 QA: Accuracy Benchmark + Production Launch Hardening

Database:

- Run `supabase/mega-part-66-accuracy-benchmark-production-launch.sql`
- Confirm tables:
  - `accuracy_benchmark_runs_v2`
  - `accuracy_benchmark_cases_v2`
  - `production_launch_checks_v2`
  - `production_launch_snapshots_v2`
  - `production_release_notes_v2`
  - `launch_hardening_events_v2`

Workflow:

- Open `/production-launch`.
- Seed production launch checks.
- Update each check status and owner note.
- Run accuracy benchmark.
- Create production launch snapshot.
- Confirm launch readiness, security hardening, operations, quality and trust scores.
- Confirm release notes appear.
- Confirm blockers are visible.

Admin:

- `/admin/production-launch` requires admin.
- Admin can view benchmarks, launch snapshots and production checks.

Final local test:

```powershell
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npx.cmd prettier --write src tests QA-CHECKLIST.md SECURITY-AUDIT.md
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

Final Git:

- Commit Part 66.
- Push to GitHub.
- Confirm Vercel deploy passes.
- Test live `/production-launch`.

Safety:

- No 100% secure claim.
- No all vulnerabilities found claim.
- No legal compliance certificate claim.
- Launch blockers must remain visible.
- Known limitations must remain visible.
