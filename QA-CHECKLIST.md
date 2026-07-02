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
- Alerts public page opens: `/alerts-notifications`
- Alerts report page opens: `/report/<scan-id>/alerts`
- Alert preferences can be saved
- In-app alerts can be enabled
- Email-ready queue can be enabled
- Generate alerts from monitoring works
- Process pending alerts works in development-simulated mode
- Alert notifications are visible
- Delivery attempts are visible
- Admin alerts page opens only for admin: `/admin/alerts`
- Background worker page opens
- Monitoring page opens
- Truth cleanup page opens
- Score explanation page opens
- Health check returns `status: ok`

## Alert safety checks

Allowed:

- Generate alerts from saved monitoring events
- Store in-app alert notifications
- Queue email-ready notifications
- Simulate delivery in development
- Track delivery attempts

Blocked:

- Do not claim real email provider delivery until provider integration exists
- Do not claim compromise from alert alone
- Do not claim full continuous pentest coverage
- Do not expose secrets in alert payloads
