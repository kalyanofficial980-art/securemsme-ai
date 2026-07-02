# SecureMSME AI QA Checklist

Run before deployment:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run e2e
```

## Mega Part 68 QA: AI Copilot over Reports

Database:

- Run `supabase/mega-part-68-ai-copilot-reports.sql`
- Confirm tables:
  - `ai_copilot_sessions_v2`
  - `ai_copilot_sources_v2`
  - `ai_copilot_messages_v2`
  - `ai_copilot_feedback_v2`
  - `ai_copilot_admin_events_v2`

Pages:

- `/ai-copilot`
- `/report/[scan-id]/ai-copilot`
- `/admin/ai-copilot`

Workflow:

1. Login.
2. Open a real report.
3. Open `/report/[scan-id]/ai-copilot`.
4. Start AI Copilot session.
5. Ask default question: "What should my developer fix first?"
6. Confirm answer is safe and source-grounded.
7. Ask unsafe payload question and confirm it is blocked.
8. Submit feedback.
9. Admin opens `/admin/ai-copilot` and sees events/feedback.

Safety:

- No exploit payloads.
- No bypass instructions.
- No brute force guidance.
- No credential theft help.
- No 100% secure claims.
- No all-vulnerabilities-found claims.
- No legal compliance certification claims.
