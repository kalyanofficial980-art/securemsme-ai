# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 71 QA: Cloud Config Audit for Supabase / Vercel / DNS

Database:

- Run `supabase/mega-part-71-cloud-config-audit.sql`
- Confirm tables:
  - `cloud_config_projects_v2`
  - `cloud_config_audit_runs_v2`
  - `cloud_config_check_items_v2`
  - `cloud_config_dns_records_v2`
  - `cloud_config_remediation_tasks_v2`
  - `cloud_config_admin_events_v2`

Pages:

- `/cloud-config-audit`
- `/report/[scan-id]/cloud-config-audit`
- `/admin/cloud-config-audit`

Workflow:

1. Login.
2. Open `/cloud-config-audit`.
3. Create cloud config project with authorization checkbox.
4. Run audit with Supabase/Vercel checklist.
5. Paste DNS text with SPF/DKIM/DMARC signals.
6. Confirm audit run appears.
7. Confirm check items appear.
8. Confirm DNS record findings appear.
9. Confirm remediation tasks appear.
10. Admin opens `/admin/cloud-config-audit`.

Safety:

- Do not paste Supabase service role keys.
- Do not paste Vercel tokens.
- Do not paste private keys.
- Do not paste passwords/OTPs/API secrets.
- No 100% secure claim.
- No legal compliance certificate claim.
- Manual checklist must be reviewed before launch claims.
