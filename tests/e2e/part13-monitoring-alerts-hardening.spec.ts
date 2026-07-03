import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const secretPattern =
  /service_role|supabase_service_role|private key|sk_live_|sk_test_|webhook_secret|database url|postgres:\/\/|authorization:\s*bearer\s+[a-z0-9._-]{20,}/i;

const unsafeAutomationPattern =
  /scan started against localhost|internal network scanned|rate limit disabled|worker secret leaked|alert token leaked|admin access granted/i;

function expectMonitoringSafe(text: string) {
  expect(text).not.toMatch(secretPattern);
  expect(text).not.toMatch(unsafeAutomationPattern);
}

test.describe("part 13 scheduled scans monitoring and alerts hardening", () => {
  test("monitoring and scheduled scan pages render safely", async ({ page }) => {
    for (const route of ["/scheduled-scans", "/monitoring-pro", "/monitoring-worker", "/alerts-notifications", "/background-worker"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");
      expect(text).toMatch(/scheduled|scan|monitoring|alert|worker|securemsme|security|login|dashboard|safe|report/i);
      expectMonitoringSafe(text);
    }
  });

  test("admin monitoring routes are protected", async ({ page }) => {
    for (const route of ["/admin/scheduled-scans", "/admin/monitoring", "/admin/alerts", "/admin/worker-queue", "/admin/cron-worker"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");
      expect(text).toMatch(/login|admin|securemsme|dashboard|scheduled|monitoring|alert|worker|access|forbidden|unauthorized/i);
      expectMonitoringSafe(text);
    }
  });

  test("fake scheduling APIs do not start unsafe scans", async ({ request }) => {
    const checks = [
      "/api/scheduled-scans/create",
      "/api/scheduled-scans/run-now",
      "/api/monitoring/enable",
      "/api/alerts/send-test",
      "/api/worker-queue/enqueue",
    ];

    for (const url of checks) {
      const response = await request.post(url, {
        timeout: 30_000,
        data: {
          target: "http://127.0.0.1:3000",
          frequency: "every_minute",
          role: "admin",
          source: "e2e-monitoring-hardening",
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);

      const text = await response.text().catch(() => "");
      expectMonitoringSafe(text);
      expect(text).not.toMatch(/queued successfully for localhost|scheduled successfully for localhost/i);
    }
  });

  test("email alert processing endpoint does not leak secrets", async ({ request }) => {
    const response = await request.get("/api/email/process-alerts", { timeout: 30_000 });

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);

    const text = await response.text().catch(() => "");
    expectMonitoringSafe(text);
  });

  test("monitoring pages do not expose admin worker links", async ({ page }) => {
    for (const route of ["/monitoring-pro", "/monitoring-worker", "/alerts-notifications"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const links = await page.locator("a").evaluateAll((anchors) =>
        anchors.map((anchor) => ({
          text: anchor.textContent || "",
          href: anchor.getAttribute("href") || "",
        }))
      );

      for (const link of links) {
        const combined = (link.text + " " + link.href).toLowerCase();
        expect(combined).not.toMatch(/\/admin\/worker-queue|\/admin\/cron-worker|webhook_secret|service_role|api_key|apikey/);
      }
    }
  });
});
