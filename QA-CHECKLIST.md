# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 74 QA: SEO + Sitemap + Launch Analytics

Database:

- Run `supabase/mega-part-74-seo-sitemap-launch-analytics.sql`
- Confirm tables:
  - `launch_seo_pages_v2`
  - `launch_analytics_events_v2`
  - `launch_analytics_daily_v2`
  - `launch_seo_checks_v2`
  - `launch_seo_admin_events_v2`

Pages/routes:

- `/seo-readiness`
- `/sitemap.xml`
- `/robots.txt`
- `/api/launch-analytics`
- `/admin/launch-analytics`

Workflow:

1. Open `/seo-readiness`.
2. Open `/sitemap.xml`.
3. Open `/robots.txt`.
4. Confirm `/public-launch`, `/pricing`, `/demo` have metadata.
5. POST safe analytics event to `/api/launch-analytics`.
6. Login as admin.
7. Open `/admin/launch-analytics`.
8. Confirm events/SEO pages are visible.

Safety:

- No cookies added.
- No fingerprinting.
- No raw secrets collected.
- No guaranteed ranking claim.
- No guaranteed traffic claim.
- No 100% SEO/security claim.
- No all-vulnerabilities-found claim.
