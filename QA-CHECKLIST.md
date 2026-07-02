# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 57 QA: Advanced Vulnerability Engine v2 + Finding Correlation

Database:

- Run `supabase/mega-part-57-advanced-vulnerability-engine-v2.sql`
- Confirm tables:
  - `advanced_vulnerability_correlation_runs`
  - `advanced_vulnerability_clusters`
  - `advanced_vulnerability_fingerprints`
  - `advanced_vulnerability_cluster_links`
  - `advanced_vulnerability_correlation_events`

Public:

- `/advanced-vulnerability-engine` opens.

Logged-in report workflow:

- Run scan.
- Run Vulnerability Scanner + Bug Finder.
- Run Accuracy Foundation.
- Run Evidence Warehouse sync.
- Open `/report/[scan-id]/advanced-vulnerability-engine`.
- Click `Run Advanced Correlation`.
- Confirm correlation run appears.
- Confirm clusters appear.
- Confirm cluster stats:
  - source items
  - evidence items
  - affected URLs
  - related engines
  - confidence score
  - false-positive risk
- Update cluster status:
  - Open
  - Validated
  - Needs review
  - Merged
  - Accepted risk
  - False positive

Admin:

- `/admin/advanced-vulnerability-engine` requires admin.
- Admin can view correlation runs and clusters.

Safety:

- Correlation engine does not exploit anything.
- It only correlates existing safe evidence/findings.
- It must not claim compromise or data theft from correlation alone.
