# VeyraSec

VeyraSec is a website security review workflow for agencies and small teams. It turns safe public website checks into prioritized findings, developer-ready remediation guidance, ownership-gated deeper review, and retest evidence.

## Core workflow

1. Add a website.
2. Run safe public checks.
3. Review prioritized findings and evidence.
4. Verify ownership or authorization before deeper workflows.
5. Apply fixes and retest to document improvement.

## Product capabilities

- Safe public website security checks
- HTTPS, TLS, security-header and exposure review
- Email-security posture checks
- Website hygiene and public-file checks
- Ownership verification by DNS, HTML file, or meta tag
- Client-facing reports and developer fix roadmaps
- Scan history and monitoring-ready website records
- Google OAuth authentication through Supabase
- Server-side plan and scan-limit enforcement
- Assisted monthly paid-plan activation for the initial launch

## Safety boundary

Standard VeyraSec workflows are designed for authorized defensive review. They do not use brute force, login bypass, destructive exploitation, or private-data access. Deeper workflows require verified ownership or explicit authorization.

## Stack

- Next.js / TypeScript
- Supabase authentication and PostgreSQL
- Vercel deployment
- Vitest / Playwright test coverage

## Local development

```bash
npm install
npm run dev
```

Run validation before merging:

```bash
npm test
npm run build
```

Environment-specific secrets must stay outside the repository and be configured through the deployment environment.

## Launch status

The current launch path uses Google sign-in, safe/ownership-gated scanning, client-ready reporting, and assisted monthly plan activation. Self-serve recurring gateway billing can be enabled later after payment-provider onboarding and production verification.

## Responsible use

Only scan websites you own, manage, or are authorized to assess. See the in-product Trust, Terms, Privacy, Acceptable Use, and Responsible Disclosure pages for customer-facing policies.
