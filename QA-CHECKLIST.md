# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 67 QA: Launch Ready Cleanup + Manual Payment + Legal

Database:

- Run `supabase/mega-part-67-launch-ready-manual-payment-legal.sql`
- Confirm tables:
  - `legal_document_versions_v2`
  - `user_legal_acceptances_v2`
  - `website_scan_authorizations_v2`
  - `manual_payment_requests_v2`
  - `manual_payment_admin_events_v2`
  - `launch_ready_user_preferences_v2`
  - `support_requests_v2`

Public pages:

- `/legal`
- `/legal/terms`
- `/legal/privacy`
- `/legal/acceptable-use`
- `/legal/responsible-disclosure`
- `/legal/refund`
- `/legal/data-processing`
- `/legal/cookie`
- `/legal/security-policy`
- `/legal/disclaimer`
- `/trust`
- `/support`

Logged-in pages:

- `/launch-ready`
- `/legal-acceptance`
- `/scan-authorization`
- `/manual-billing`

Admin:

- `/admin/manual-payments`

Workflow:

1. Login.
2. Open `/legal-acceptance`.
3. Accept required legal documents.
4. Open `/scan-authorization`.
5. Confirm target ownership/permission.
6. Open `/manual-billing`.
7. Submit payment request with UTR/reference.
8. Login admin.
9. Open `/admin/manual-payments`.
10. Approve or reject request.
11. Confirm billing profile plan updates on approval.

Safety:

- No card data.
- No OTP/UPI PIN/password collection.
- No unauthorized scanning.
- No 100% secure claim.
- No all-vulnerabilities-found claim.
- Legal pages are templates and need professional review before full public paid launch.
