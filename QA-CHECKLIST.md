# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 56 QA: Evidence Warehouse v2 + Proof Chain System

Database:

- Run `supabase/mega-part-56-evidence-warehouse-v2.sql`
- Confirm tables:
  - `security_evidence_items`
  - `security_evidence_links`
  - `security_proof_chains`
  - `security_evidence_snapshots`
  - `security_evidence_events`

Public:

- `/evidence-warehouse` opens.

Logged-in report workflow:

- Run scan.
- Run Scan Orchestrator.
- Run Vulnerability Scanner + Bug Finder.
- Run Accuracy Foundation.
- Open `/report/[scan-id]/evidence-warehouse`.
- Click `Sync evidence warehouse`.
- Proof chain is created.
- Evidence items appear.
- Evidence hashes appear.
- Root/latest hash appears.
- Validate evidence item.
- Completeness score updates.
- Create pre-report snapshot.
- Create client-share snapshot.

Admin:

- `/admin/evidence-warehouse` requires admin.
- Admin can view proof chains and evidence items.

Safety:

- Evidence warehouse stores proof only.
- It does not perform exploit testing.
- Sensitive evidence should be redacted before client sharing.
- Strong client claims should be backed by validated evidence.
