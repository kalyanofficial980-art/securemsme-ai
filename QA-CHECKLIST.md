# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 75 QA: Contact Support + Lead Reply Workflow

Database:

- Run `supabase/mega-part-75-contact-support-lead-reply.sql`
- Confirm tables:
  - `support_contact_tickets_v2`
  - `lead_reply_drafts_v2`
  - `support_email_queue_v2`
  - `support_contact_events_v2`

Pages:

- `/contact`
- `/support`
- `/support/success`
- `/admin/support-inbox`

Workflow:

1. Open `/contact` without login.
2. Submit a support ticket with consent and no-sensitive-data confirmation.
3. Confirm `/support/success` opens.
4. Login as admin.
5. Open `/admin/support-inbox`.
6. Update ticket status.
7. Create safe reply draft.
8. Check manual email queue item.
9. Mark reply as manually sent.

Safety:

- No passwords collected.
- No OTP/UPI PIN/card data collected.
- No private keys/API tokens collected.
- No fake response-time guarantee.
- No automatic bulk/cold emailing.
- Safe reply drafts only.
- Manual email queue foundation only.
