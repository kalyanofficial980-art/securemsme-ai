import { test, expect } from "@playwright/test";
import { expectRouteSafe, expectApiSafe, expectLinksSafe, fakeId } from "./_final-launch-hardening-helpers";

test.describe.configure({ timeout: 90_000 });

test.describe("parts 17-25 final launch hardening", () => {
  test("part 17 real pilot customer onboarding and demo flow is safe", async ({ page, request }) => {
    for (const route of ["/demo", "/contact", "/support", "/pricing", "/onboarding", "/onboarding/first-scan", "/websites/new", "/ownership-verification", "/scan-authorization", "/demo/success", "/support/success", "/onboarding/success"]) {
      await expectRouteSafe(page, route, /demo|contact|support|pricing|onboarding|website|ownership|authorization|success|securemsme|security|scan|report|login|dashboard/i);
    }

    for (const url of ["/api/demo/request", "/api/onboarding/complete", "/api/pilot/onboard", "/api/support/ticket"]) {
      const text = await expectApiSafe(request, "POST", url, {
        email: "pilot17@example.com",
        company: "Part 17 Pilot",
        role: "admin",
        plan: "enterprise",
      });

      expect(text).not.toMatch(/admin access granted|role updated to admin|enterprise access granted/i);
    }

    await expectLinksSafe(page, ["/demo", "/contact", "/support", "/pricing", "/onboarding"]);
  });

  test("part 18 scan and report generation pipeline is safe", async ({ page, request }) => {
    for (const route of ["/scan", "/scan-authorization", "/ownership-verification", "/authenticated-scan", "/scan-consistency", "/scan-orchestrator", "/report-truth-cleanup", "/client-report-v4", "/accuracy-foundation", "/evidence-warehouse", "/retest-proof"]) {
      await expectRouteSafe(page, route, /scan|authorization|ownership|permission|report|evidence|accuracy|truth|client|retest|securemsme|security|risk|safe|login|dashboard/i);
    }

    for (const target of ["http://127.0.0.1:3000", "http://localhost:3000", "https://example.com"]) {
      const text = await expectApiSafe(request, "POST", "/api/scan", {
        url: target,
        targetUrl: target,
        source: "part18-scan-report-hardening",
      });

      expect(text).not.toMatch(/scan started against localhost|internal network scanned|rate limit disabled/i);
    }

    for (const route of ["/report/" + fakeId, "/report/" + fakeId + "/print", "/report/" + fakeId + "/fix-roadmap", "/report/" + fakeId + "/evidence-warehouse"]) {
      const text = await expectRouteSafe(page, route, /report|not found|login|security|risk|evidence|scan|securemsme|dashboard|access/i);
      expect(text).not.toMatch(/confirmed breach|data stolen|passwords leaked|critical vulnerability confirmed/i);
    }

    await expectLinksSafe(page, ["/scan", "/scan-authorization", "/client-report-v4", "/report-truth-cleanup"]);
  });

  test("part 19 admin operations dashboard and support workflow are protected", async ({ page, request }) => {
    for (const route of ["/admin", "/admin/launch-ops", "/admin/support-inbox", "/admin/lead-crm", "/admin/manual-payments", "/admin/users", "/admin/organizations", "/admin/scans", "/admin/websites", "/admin/worker-queue", "/admin/abuse-protection", "/admin/launch-analytics"]) {
      await expectRouteSafe(page, route, /admin|login|securemsme|dashboard|access|forbidden|unauthorized|support|lead|payment|users|organizations|scan|website|worker|abuse|analytics/i);
    }

    for (const url of ["/api/admin/users/" + fakeId + "/role", "/api/admin/support-inbox/export", "/api/admin/manual-payments/approve", "/api/admin/lead-crm/export"]) {
      const text = await expectApiSafe(request, "POST", url, {
        role: "admin",
        user_id: fakeId,
        approve: true,
      });

      expect(text).not.toMatch(/admin access granted|role updated to admin|exported all customers|payment approved successfully/i);
    }

    await expectLinksSafe(page, ["/support", "/contact", "/security", "/trust"]);
  });

  test("part 20 private pilot release and backup checklist is safe", async ({ page, request }) => {
    for (const route of ["/production-checklist", "/launch-final-checklist", "/production-launch", "/launch-ready", "/beta", "/public-launch", "/trust", "/security", "/legal", "/legal/terms", "/legal/privacy", "/legal/refund", "/legal/responsible-disclosure"]) {
      await expectRouteSafe(page, route, /production|launch|checklist|beta|pilot|trust|security|legal|terms|privacy|refund|responsible|disclosure|securemsme|dashboard|login|ready|safe/i);
    }

    for (const route of ["/robots.txt", "/sitemap.xml", "/.well-known/security.txt"]) {
      await expectRouteSafe(page, route, /securemsme|sitemap|user-agent|disallow|allow|security|contact|policy/i);
    }

    await expectApiSafe(request, "GET", "/api/health");
    await expectApiSafe(request, "POST", "/api/launch-analytics", {
      event: "part20_private_pilot_release_check",
      path: "/production-checklist",
    });

    await expectLinksSafe(page, ["/production-checklist", "/launch-final-checklist", "/public-launch", "/trust", "/security"]);
  });

  test("part 21 payment and manual billing production process is safe", async ({ page, request }) => {
    for (const route of ["/pricing", "/manual-billing", "/billing-ai-triage", "/support", "/legal/refund"]) {
      await expectRouteSafe(page, route, /pricing|manual|billing|payment|support|refund|securemsme|plan|security|login|dashboard/i);
    }

    const successText = await expectRouteSafe(page, "/support/success?payment_id=fake_e2e_payment&amount=999999&plan=enterprise", /support|success|payment|securemsme|message|dashboard|security/i);
    expect(successText).not.toMatch(/payment verified successfully|plan upgraded successfully|enterprise access granted|admin access granted/i);

    for (const url of ["/api/billing/manual-payment", "/api/manual-payments", "/api/payments/verify", "/api/checkout/create-session", "/api/razorpay/verify", "/api/billing/activate"]) {
      const text = await expectApiSafe(request, "POST", url, {
        payment_id: "fake_part21_payment",
        order_id: "fake_part21_order",
        amount: 999999,
        plan: "enterprise",
        status: "paid",
        role: "admin",
      });

      expect(text).not.toMatch(/payment verified successfully|plan upgraded successfully|enterprise access granted|admin access granted|role updated to admin/i);
    }

    await expectLinksSafe(page, ["/pricing", "/manual-billing", "/billing-ai-triage", "/support"]);
  });

  test("part 22 legal refund privacy and disclosure pages are safe", async ({ page, request }) => {
    for (const route of ["/legal", "/legal/terms", "/legal/privacy", "/legal/refund", "/legal/responsible-disclosure", "/trust", "/security", "/legal-acceptance", "/signup", "/login"]) {
      const text = await expectRouteSafe(page, route, /legal|terms|privacy|refund|responsible|disclosure|trust|security|securemsme|policy|safe|acceptance|signup|login|dashboard/i);
      expect(text).not.toMatch(/guaranteed compliance|guaranteed hack proof|100% secure by contract|no liability ever/i);
    }

    await expectApiSafe(request, "POST", "/api/support/ticket", {
      email: "legal22@example.com",
      type: "legal",
      message: "part22 legal workflow check",
    });

    await expectApiSafe(request, "POST", "/api/launch-analytics", {
      event: "part22_legal_page_view",
      path: "/legal/terms",
    });

    await expectLinksSafe(page, ["/legal", "/legal/terms", "/legal/privacy", "/legal/refund", "/trust", "/security"]);
  });

  test("part 23 lead CRM and support inbox workflow is protected", async ({ page, request }) => {
    for (const route of ["/demo", "/contact", "/support", "/pricing", "/public-launch", "/admin/lead-crm", "/admin/support-inbox", "/admin/demo-funnel", "/admin/lead-crm/export"]) {
      await expectRouteSafe(page, route, /demo|contact|support|pricing|lead|admin|export|login|securemsme|dashboard|access|forbidden|unauthorized|security|scan|report|message|pilot/i);
    }

    for (const url of ["/api/demo/request", "/api/support/ticket", "/api/launch-analytics", "/api/admin/lead-crm/export", "/api/admin/support-inbox/export"]) {
      const text = await expectApiSafe(request, "POST", url, {
        email: "lead23@example.com",
        company: "Lead 23",
        role: "admin",
        message: "part23 lead crm check",
      });

      expect(text).not.toMatch(/exported all customers|support inbox exported|admin access granted|role updated to admin/i);
    }

    const successText = await expectRouteSafe(page, "/support/success?ticket_id=fake_part23_ticket", /support|success|message|securemsme|dashboard|contact|security/i);
    expect(successText).not.toMatch(/internal admin note|private customer export|support inbox exported/i);

    await expectLinksSafe(page, ["/demo", "/contact", "/support", "/public-launch"]);
  });

  test("part 24 monitoring alerts backup and rollback ops are safe", async ({ page, request }) => {
    for (const route of ["/monitoring-pro", "/monitoring-worker", "/alerts-notifications", "/background-worker", "/scheduled-scans", "/admin/worker-queue", "/admin/cron-worker", "/admin/scheduled-scans", "/admin/monitoring", "/admin/alerts", "/admin/launch-ops"]) {
      await expectRouteSafe(page, route, /monitoring|alert|worker|background|scheduled|scan|admin|cron|launch|securemsme|security|login|dashboard|safe|access|forbidden|unauthorized/i);
    }

    for (const check of [
      { method: "GET" as const, url: "/api/email/process-alerts" },
      { method: "POST" as const, url: "/api/cron/worker" },
      { method: "POST" as const, url: "/api/scheduled-scans/run-now" },
      { method: "POST" as const, url: "/api/alerts/send-test" },
    ]) {
      const text = await expectApiSafe(request, check.method, check.url, {
        target: "http://127.0.0.1:3000",
        source: "part24-monitoring-ops",
      });

      expect(text).not.toMatch(/worker secret leaked|alert token leaked|rate limit disabled|internal network scanned/i);
    }

    for (const route of ["/production-checklist", "/launch-final-checklist", "/repo-security", "/security"]) {
      const text = await expectRouteSafe(page, route, /production|launch|repo|security|backup|rollback|securemsme|safe|checklist|dashboard|login/i);
      expect(text).not.toMatch(/disable backups|publish database dump|rollback without review|expose production secrets/i);
    }

    await expectLinksSafe(page, ["/monitoring-pro", "/monitoring-worker", "/alerts-notifications", "/scheduled-scans"]);
  });

  test("part 25 final paid launch security audit and v1 gate is safe", async ({ page, request }) => {
    for (const route of ["/", "/pricing", "/trust", "/security", "/legal", "/support", "/demo", "/contact", "/production-checklist", "/public-launch", "/login", "/signup", "/dashboard", "/organizations", "/websites", "/websites/new", "/scan", "/reviews"]) {
      await expectRouteSafe(page, route, /securemsme|security|pricing|trust|legal|support|demo|contact|production|launch|scan|report|safe|login|signup|dashboard|organization|website|review|access|onboarding/i);
    }

    await expectApiSafe(request, "GET", "/api/health");
    await expectApiSafe(request, "POST", "/api/launch-analytics", { event: "part25_final_gate", path: "/" });
    await expectApiSafe(request, "POST", "/api/scan", { url: "https://example.com", source: "part25" });
    await expectApiSafe(request, "GET", "/api/report/" + fakeId + "/pdf");

    for (const route of ["/report/" + fakeId, "/report/" + fakeId + "/print", "/client-portal", "/retest-client-portal-pro"]) {
      const text = await expectRouteSafe(page, route, /securemsme|report|portal|client|not found|login|dashboard|security|access|invalid|expired|forbidden|unauthorized/i);
      expect(text).not.toMatch(/confirmed breach|data stolen|passwords leaked|private customer export/i);
    }

    await expectLinksSafe(page, ["/", "/pricing", "/trust", "/security", "/legal", "/support", "/demo"]);
  });
});

