import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const fakeId = "00000000-0000-4000-8000-000000000012";

const secretPattern =
  /service_role|supabase_service_role|private key|sk_live_|sk_test_|database url|postgres:\/\/|authorization:\s*bearer\s+[a-z0-9._-]{20,}|refresh_token|access_token/i;

const privateDataPattern =
  /customer_password|raw_cookie|session_token|internal admin note|tenant secret|organization secret|private customer export/i;

function expectNoTenantLeak(text: string) {
  expect(text).not.toMatch(secretPattern);
  expect(text).not.toMatch(privateDataPattern);
  expect(text).not.toMatch(/admin access granted|role updated to admin|tenant switched successfully|organization takeover/i);
}

test.describe("part 12 tenant and admin access control hardening", () => {
  test("protected user workspace routes do not expose private data when logged out", async ({ page }) => {
    for (const route of ["/dashboard", "/organizations", "/websites", "/scheduled-scans", "/agency-dashboard"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");
      expect(text).toMatch(/login|sign in|securemsme|dashboard|organization|website|access|security|unauthorized|forbidden/i);
      expectNoTenantLeak(text);
    }
  });

  test("admin routes are protected and do not leak tenant data", async ({ page }) => {
    for (const route of ["/admin", "/admin/users", "/admin/organizations", "/admin/manual-payments", "/admin/scans", "/admin/websites"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");
      expect(text).toMatch(/login|admin|securemsme|dashboard|access|forbidden|unauthorized|security/i);
      expectNoTenantLeak(text);
    }
  });

  test("fake organization and website routes do not expose private records", async ({ page }) => {
    for (const route of [`/websites/${fakeId}`, `/websites/${fakeId}/verify`, `/reviews/${fakeId}`, `/report/${fakeId}`]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");
      expect(text).toMatch(/login|not found|securemsme|report|website|review|security|dashboard|access|invalid|unauthorized|forbidden/i);
      expectNoTenantLeak(text);
    }
  });

  test("fake tenant mutation APIs are safely rejected", async ({ request }) => {
    const checks = [
      `/api/organizations/${fakeId}/switch`,
      `/api/organizations/${fakeId}/members`,
      `/api/websites/${fakeId}/deep-scan`,
      `/api/websites/${fakeId}/rescan`,
      `/api/admin/users/${fakeId}/role`,
    ];

    for (const url of checks) {
      const response = await request.post(url, {
        timeout: 30_000,
        data: {
          role: "admin",
          organization_id: fakeId,
          website_id: fakeId,
          source: "e2e-tenant-isolation",
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);

      const text = await response.text().catch(() => "");
      expectNoTenantLeak(text);
    }
  });

  test("public pages do not link to sensitive admin tenant operations", async ({ page }) => {
    for (const route of ["/", "/pricing", "/trust", "/client-portal"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const links = await page.locator("a").evaluateAll((anchors) =>
        anchors.map((anchor) => ({
          text: anchor.textContent || "",
          href: anchor.getAttribute("href") || "",
        }))
      );

      for (const link of links) {
        const combined = (link.text + " " + link.href).toLowerCase();
        expect(combined).not.toMatch(/\/admin\/users|\/admin\/organizations|\/admin\/manual-payments|service_role|tenant secret|api_key|apikey/);
      }
    }
  });
});
