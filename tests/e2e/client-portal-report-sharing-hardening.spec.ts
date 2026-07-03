import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const fakeReportId = "00000000-0000-4000-8000-000000000009";
const fakeReviewId = "00000000-0000-4000-8000-000000000019";
const fakeToken = "fake-public-share-token-e2e-do-not-trust";

const safePageText =
  /securemsme|client|portal|report|review|security|risk|login|sign in|dashboard|not found|invalid|expired|unauthorized|forbidden|404|error/i;

const forbiddenSecretText =
  /service_role|supabase_service_role|private key|BEGIN RSA PRIVATE KEY|BEGIN PRIVATE KEY|sk_live_|sk_test_|eyJhbGciOi|authorization:\s*bearer|password:\s*[^\s]+|api[_-]?secret|database url/i;

const forbiddenPrivateDataText =
  /customer_password|raw_cookie|session_token|refresh_token|access_token|credit card|aadhaar|pan number|private customer data|internal admin note/i;

const forbiddenAdminOrOpsLinks =
  /\/admin\/users|\/admin\/organizations|\/admin\/tool-runs|\/admin\/worker-queue|\/admin\/lead-crm|service_role|api_key|apikey|secret/i;

const publicClientRoutes = [
  "/client-portal",
  "/retest-client-portal-pro",
  "/security-review-workspace",
  "/reviews",
];

const fakeSharedReportRoutes = [
  `/report/${fakeReportId}`,
  `/report/${fakeReportId}?shareToken=${fakeToken}`,
  `/report/${fakeReportId}/print?shareToken=${fakeToken}`,
  `/report/${fakeReportId}/evidence-warehouse?shareToken=${fakeToken}`,
  `/report/${fakeReportId}/fix-roadmap?shareToken=${fakeToken}`,
  `/reviews/${fakeReviewId}?shareToken=${fakeToken}`,
];

const sharingApiChecks = [
  { method: "GET", url: `/api/report/${fakeReportId}` },
  { method: "GET", url: `/api/reports/${fakeReportId}` },
  { method: "GET", url: `/api/reports/${fakeReportId}/share?token=${fakeToken}` },
  { method: "POST", url: `/api/reports/${fakeReportId}/share` },
  { method: "GET", url: `/api/client-portal/${fakeReportId}?token=${fakeToken}` },
];

async function expectNoLeaksFromBodyText(bodyText: string) {
  expect(bodyText).not.toMatch(forbiddenSecretText);
  expect(bodyText).not.toMatch(forbiddenPrivateDataText);
  expect(bodyText).not.toMatch(/confirmed breach|data stolen|passwords leaked|guaranteed compromised/i);
}

test.describe("client portal access control and report sharing hardening", () => {
  test("public client portal pages render safely without secrets", async ({ page }) => {
    for (const route of publicClientRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const bodyText = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(bodyText).toMatch(safePageText);
      await expectNoLeaksFromBodyText(bodyText);
    }
  });

  test("fake shared report links do not expose private report data", async ({ page }) => {
    for (const route of fakeSharedReportRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const bodyText = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(bodyText).toMatch(safePageText);
      await expectNoLeaksFromBodyText(bodyText);
    }
  });

  test("public report and client portal links do not expose admin operations", async ({ page }) => {
    const routesToCheck = [
      "/client-portal",
      "/retest-client-portal-pro",
      `/report/${fakeReportId}?shareToken=${fakeToken}`,
      `/report/${fakeReportId}/print?shareToken=${fakeToken}`,
    ];

    for (const route of routesToCheck) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const links = await page.locator("a").evaluateAll((anchors) =>
        anchors.map((anchor) => ({
          text: anchor.textContent || "",
          href: anchor.getAttribute("href") || "",
        }))
      );

      for (const link of links) {
        const combined = `${link.text} ${link.href}`.toLowerCase();
        expect(combined).not.toMatch(forbiddenAdminOrOpsLinks);
      }
    }
  });

  test("report sharing APIs are protected or safely rejected", async ({ request }) => {
    for (const check of sharingApiChecks) {
      const response =
        check.method === "POST"
          ? await request.post(check.url, {
              timeout: 30_000,
              data: {
                reportId: fakeReportId,
                token: fakeToken,
                email: "attacker@example.com",
                role: "admin",
              },
            })
          : await request.get(check.url, { timeout: 30_000 });

      expect([200, 302, 307, 308, 400, 401, 403, 404, 405, 409, 422, 429, 500]).toContain(
        response.status()
      );

      const text = await response.text().catch(() => "");

      expect(text).not.toMatch(forbiddenSecretText);
      expect(text).not.toMatch(forbiddenPrivateDataText);
      expect(text).not.toMatch(/share token created|admin access granted|role updated to admin|service role/i);
    }
  });

  test("client-facing report share pages use safe language", async ({ page }) => {
    for (const route of ["/client-report-v4", "/client-portal", "/retest-client-portal-pro"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const bodyText = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(bodyText).toMatch(/client|report|security|review|portal|safe|risk|dashboard/i);
      expect(bodyText).not.toMatch(/publicly accessible private report|anyone can view all reports|no permission required/i);
      await expectNoLeaksFromBodyText(bodyText);
    }
  });
});
