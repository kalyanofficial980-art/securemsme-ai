# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 58 QA: Advanced Crawler + Asset Discovery v2

Database:

- Run `supabase/mega-part-58-advanced-crawler-asset-discovery-v2.sql`
- Confirm tables:
  - `advanced_crawler_runs`
  - `discovered_assets_v2`
  - `crawler_link_edges_v2`
  - `crawler_form_inventory_v2`
  - `asset_discovery_snapshots_v2`
  - `advanced_crawler_events`

Public:

- `/advanced-crawler` opens.

Logged-in report workflow:

- Open `/report/[scan-id]/advanced-crawler`.
- Select crawler mode:
  - Safe Light
  - Safe Standard
  - Safe Deep
- Tick authorization checkbox.
- Run crawler.
- Confirm discovered assets appear.
- Confirm form inventory appears if forms exist.
- Confirm coverage score appears.
- Confirm asset risk score appears.
- Confirm login/admin/API/checkout counters appear.
- Confirm link graph preview appears.

Admin:

- `/admin/advanced-crawler` requires admin.
- Admin can view crawler runs and assets.

Safety:

- Same-origin only.
- GET-only.
- No form submission.
- No POST/PUT/PATCH/DELETE.
- No brute force.
- No login bypass.
- No exploit payloads.
- No private data extraction.
