import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const secretPattern =
  /service_role|supabase_service_role|private key|sk_live_|sk_test_|database url|postgres:\/\/|authorization:\s*bearer\s+[a-z0-9._-]{20,}|refresh_token|access_token/i;

const exportLeakPattern =
  /customer_password|raw_cookie|session_token|credit card|aadhaar|pan number|private customer export|internal admin note|full database dump/i;

function expectAuditSafe(text: string) {
  expect(text).not.toMatch(secretPattern);
  expect(text).not.toMatch(exportLeakPattern);
  expect(text).not.toMatch(/tool command executed as admin|shell command output|database dump complete|exported all customers/i);
}

test.describe("part 14 audit export and data handling hardening", () => {
  test("audit and evidence pages render safely", async ({ page }) => {
    for (const route of ["/audit-framework", "/audit/import", "/audit/evidence-history", "/evidence-warehouse", "/repo-security"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");
      expect(text).toMatch(/audit|evidence|repo|security|securemsme|login|dashboard|import|framework|safe/i);
      expectAuditSafe(text);
    }
  });

  test("admin export and tool routes are protected", async ({ page }) => {
    for (const route of ["/admin/lead-crm/export", "/admin/tool-runs", "/admin/repo-security", "/admin/audit", "/admin/security-intelligence"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");
      expect(text).toMatch(/login|admin|securemsme|dashboard|audit|security|tool|export|access|forbidden|unauthorized/i);
      expectAuditSafe(text);
    }
  });

  test("audit import API does not leak private data", async ({ request }) => {
    const response = await request.post("/api/audit/import-passive", {
      timeout: 30_000,
      data: {
        source: "e2e-audit-hardening",
        report_id: "00000000-0000-4000-8000-000000000014",
        payload: {
          safe: true,
          note: "e2e safe audit import check",
        },
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);

    const text = await response.text().catch(() => "");
    expectAuditSafe(text);
  });

  test("tool command API does not expose dangerous output", async ({ request }) => {
    const response = await request.post("/api/audit/tool-command", {
      timeout: 30_000,
      data: {
        command: "e2e-noop",
        source: "e2e-tool-command-hardening",
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);

    const text = await response.text().catch(() => "");
    expectAuditSafe(text);
    expect(text).not.toMatch(/\/etc\/passwd|cmd\.exe|powershell -enc|reverse shell|meterpreter|nmap -a|sqlmap/i);
  });

  test("audit pages do not expose admin export links publicly", async ({ page }) => {
    for (const route of ["/audit-framework", "/evidence-warehouse", "/repo-security"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const links = await page.locator("a").evaluateAll((anchors) =>
        anchors.map((anchor) => ({
          text: anchor.textContent || "",
          href: anchor.getAttribute("href") || "",
        }))
      );

      for (const link of links) {
        const combined = (link.text + " " + link.href).toLowerCase();
        expect(combined).not.toMatch(/\/admin\/lead-crm\/export|\/admin\/tool-runs|service_role|database url|api_key|apikey/);
      }
    }
  });
});
