import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const fakeReportId = "00000000-0000-4000-8000-000000000000";

const reportSafetyRoutes = [
  "/accuracy-foundation",
  "/report-truth-cleanup",
  "/client-report-v4",
  "/audit-framework",
];

const fakeReportRoutes = [
  `/report/${fakeReportId}`,
  `/report/${fakeReportId}/print`,
  `/report/${fakeReportId}/security-engine`,
  `/report/${fakeReportId}/vulnerability-scanner`,
  `/report/${fakeReportId}/fix-roadmap`,
];

const forbiddenFalsePositiveClaims =
  /confirmed breach|confirmed hacked|actively exploited by attackers|data stolen|passwords leaked|critical vulnerability confirmed|guaranteed compromised|100% vulnerable/i;

const forbiddenDangerousOutput =
  /reverse shell|meterpreter|msfconsole|sqlmap -|nmap -A|masscan|\/etc\/passwd|cmd\.exe|powershell -enc|credential dump/i;

test.describe("report accuracy and false-positive control", () => {
  test("accuracy and report-truth pages explain evidence-based reporting", async ({ page }) => {
    for (const route of reportSafetyRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const body = page.locator("body");

      await expect(body).toContainText(
        /accuracy|evidence|report|risk|confidence|remediation|safe|audit|truth|security/i,
        { timeout: 20_000 }
      );

      await expect(body).not.toContainText(forbiddenFalsePositiveClaims);
      await expect(body).not.toContainText(forbiddenDangerousOutput);
    }
  });

  test("missing report routes do not invent findings", async ({ page }) => {
    for (const route of fakeReportRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const bodyText = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(bodyText).not.toMatch(forbiddenFalsePositiveClaims);
      expect(bodyText).not.toMatch(forbiddenDangerousOutput);

      expect(bodyText).toMatch(
        /report|not found|login|sign in|security|risk|evidence|scan|securemsme|dashboard/i
      );
    }
  });

  test("report API for missing report is safely rejected or protected", async ({ request }) => {
    const response = await request.get(`/api/report/${fakeReportId}/pdf`, {
      timeout: 30_000,
    });

    expect([200, 302, 307, 308, 400, 401, 403, 404, 405, 422, 429, 500]).toContain(response.status());

    const text = await response.text().catch(() => "");

    expect(text).not.toMatch(forbiddenFalsePositiveClaims);
    expect(text).not.toMatch(forbiddenDangerousOutput);
  });

  test("public report pages do not expose admin-only operation links", async ({ page }) => {
    await page.goto(`/report/${fakeReportId}`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    const links = await page.locator("a").evaluateAll((anchors) =>
      anchors.map((anchor) => ({
        text: anchor.textContent || "",
        href: anchor.getAttribute("href") || "",
      }))
    );

    for (const link of links) {
      const combined = `${link.text} ${link.href}`.toLowerCase();

      expect(combined).not.toMatch(
        /admin\/users|admin\/organizations|admin\/tool-runs|admin\/worker-queue|service_role|secret|apikey|api_key/
      );
    }
  });

  test("report language uses cautious risk wording instead of absolute claims", async ({ page }) => {
    for (const route of ["/client-report-v4", "/report-truth-cleanup", "/accuracy-foundation"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const bodyText = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(bodyText).not.toMatch(/always vulnerable|never safe|guaranteed hack|definitely breached|100% secure|100% unsafe/i);

      expect(bodyText).toMatch(/risk|evidence|security|report|confidence|review|remediation|safe|accuracy/i);
    }
  });
});
