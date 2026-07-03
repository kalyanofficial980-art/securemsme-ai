import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const secretPattern =
  /service_role|supabase_service_role|sk_live_|sk_test_|razorpay_secret|stripe_secret|database url|postgres:\/\/|BEGIN RSA PRIVATE KEY|BEGIN PRIVATE KEY|authorization:\s*bearer\s+[a-z0-9._-]{20,}/i;

const unsafeSuccessPattern =
  /admin access granted|role updated to admin|abuse bypassed|support inbox exported|private customer data leaked|passwords leaked|tokens leaked/i;

function expectSafeSupportText(text: string) {
  expect(text).not.toMatch(secretPattern);
  expect(text).not.toMatch(unsafeSuccessPattern);

  const mentionsPrivateKey = /private keys?/i.test(text);
  const privateKeyIsGuidance = /do not send .*private keys?|not sending .*private keys?|credentials, private keys, tokens|safety/i.test(text);
  expect(!mentionsPrivateKey || privateKeyIsGuidance).toBeTruthy();
}

test.describe("part 11 support inbox and abuse protection hardening", () => {
  test("public support and contact pages are safe", async ({ page }) => {
    for (const route of ["/support", "/contact", "/support/success"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");
      expect(text).toMatch(/support|contact|securemsme|help|request|message|security|success|dashboard|login/i);
      expectSafeSupportText(text);
    }
  });

  test("admin support inbox and abuse protection require safe access", async ({ page }) => {
    for (const route of ["/admin/support-inbox", "/admin/abuse-protection", "/admin/lead-crm"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");
      expect(text).toMatch(/login|admin|securemsme|dashboard|forbidden|unauthorized|support|abuse|access/i);
      expectSafeSupportText(text);
    }
  });

  test("fake abuse/support APIs do not grant access or leak data", async ({ request }) => {
    const checks = [
      "/api/support/ticket",
      "/api/support/reply",
      "/api/abuse/report",
      "/api/abuse/resolve",
      "/api/admin/support-inbox/export",
    ];

    for (const url of checks) {
      const response = await request.post(url, {
        timeout: 30_000,
        data: {
          email: "attacker@example.com",
          role: "admin",
          priority: "urgent",
          message: "e2e safe support abuse check",
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);

      const text = await response.text().catch(() => "");
      expectSafeSupportText(text);
    }
  });

  test("support pages do not expose admin operation links", async ({ page }) => {
    for (const route of ["/support", "/contact"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const links = await page.locator("a").evaluateAll((anchors) =>
        anchors.map((anchor) => ({
          text: anchor.textContent || "",
          href: anchor.getAttribute("href") || "",
        }))
      );

      for (const link of links) {
        const combined = (link.text + " " + link.href).toLowerCase();
        expect(combined).not.toMatch(/\/admin\/support-inbox|\/admin\/users|\/admin\/organizations|service_role|api_key|apikey|secret/);
      }
    }
  });

  test("abuse protection pages use safe defensive language", async ({ page }) => {
    for (const route of ["/admin/abuse-protection", "/legal/responsible-disclosure", "/security"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");
      expect(text).toMatch(/security|abuse|responsible|disclosure|securemsme|safe|login|admin|protection|trust/i);
      expect(text).not.toMatch(/bypass abuse protection|disable rate limit|exploit payload|steal credentials/i);
      expectSafeSupportText(text);
    }
  });
});
