# SecureMSME AI Security Audit Notes

## Mega Part 51 Client Portal + Shareable Report Access Foundation

Added:

- `client_portal_links`
- `client_portal_access_events`
- Public token RPC `get_client_portal_link`
- Client-safe snapshot builder
- Shareable report link creation
- Link expiry
- Link revoke
- Snapshot refresh
- Public client portal route
- Report client portal management page
- Admin client portal observability page
- Unit tests and E2E coverage

## Security model

- Raw `scans` table is not exposed to public portal users.
- Public access uses an exact random token.
- Public RPC returns only safe snapshot fields.
- Link must be active and not expired.
- View count and access event are recorded.
- Authenticated users manage their own links through RLS.

## What this part does

- Enables client-safe report sharing.
- Supports agency client delivery.
- Provides access events and revoke/expiry controls.

## What this part does not do

- It does not implement password-protected client portal login.
- It does not implement client comments/approval yet.
- It does not implement PDF portal downloads yet.
- It does not expose internal engine evidence to clients.

## Next layer

Mega Part 52 should add:

- Client Portal Feedback + Approval Workflow
- Client comments
- Fix approval status
- Client acceptance proof
- Developer/client handoff workflow
