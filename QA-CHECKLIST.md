# SecureMSME AI QA Checklist

Run this before every deployment.

## Automated checks

```powershell
npm.cmd run audit:app
npm.cmd run e2e
npm.cmd run audit:npm
```

## Manual product checks

- Signup works
- Login works
- Dashboard opens after login
- Add website works
- Manual scan works
- Saved website rescan works
- Email provider public page opens: `/email-provider-integration`
- Email delivery report page opens: `/report/<scan-id>/email-delivery`
- Email settings save works
- Test email works when env is configured
- Missing env shows provider-not-configured or missing-env
- Pending alert emails process after alerts are generated
- Delivery runs are saved
- Provider message ID is saved when sent
- Provider error is saved when failed
- Email events are saved
- Admin email provider page opens only for admin: `/admin/email-provider`
- Email cron helper route opens: `/api/email/process-alerts`
- Monitoring public page opens: `/monitoring-worker`
- Alerts page opens: `/report/<scan-id>/alerts`
- Report truth cleanup public page opens: `/report-truth-cleanup`
- Scan consistency public page opens: `/scan-consistency`
- Health check returns `status: ok`

## Email safety checks

Allowed:

- Send security alert emails through Resend when configured
- Track sent/failed/provider-not-configured
- Store provider message ID
- Store delivery error
- Use safe alert wording

Blocked:

- Do not store RESEND_API_KEY in database
- Do not claim exploitation or compromise from alert alone
- Do not claim full pentest coverage
- Do not claim compliance certificate
- Do not email low severity alerts if threshold blocks them
