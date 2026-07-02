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
- Client portal public info page opens: `/client-portal`
- Report client portal page opens: `/report/<scan-id>/client-portal`
- Create client portal link works
- Shareable token link opens: `/client-portal/<token>`
- Client portal shows score/risk/executive summary
- Client portal shows client-safe findings
- Client portal shows safe claims and blocked claims
- Link view count updates after opening token link
- Refresh snapshot works
- Revoke link works
- Revoked link no longer opens
- Admin client portal page opens only for admin: `/admin/client-portal`
- Organization page still works
- Agency dashboard still works
- Email delivery page still works
- Health check returns `status: ok`

## Client portal safety checks

Allowed:

- Share safe report snapshot
- Show score, risk, summary, findings and next actions
- Track link views
- Expire/revoke links
- Show blocked claims clearly

Blocked:

- Do not expose raw scanner payloads
- Do not expose admin/internal tools
- Do not claim 100% security
- Do not claim full pentest certificate
- Do not claim compliance certification
- Do not expose private authenticated evidence
