import { expect, test } from "@playwright/test";

const publicPages = [
  { path: "/", text: "SecureMSME AI" },
  { path: "/pricing", text: "Pricing" },
  { path: "/trust", text: "Trust" },
  { path: "/security", text: "Security" },
  { path: "/legal", text: "Legal" },
  { path: "/tools", text: "Clear security reports" },
  { path: "/safe-templates", text: "Extra checks" },
  { path: "/passive-worker", text: "Public website observations" },
  { path: "/known-risks", text: "CVE-aware guidance" },
  { path: "/authorized-pentest", text: "Deeper security checks" },
  { path: "/real-security-checks", text: "Real evidence" },
  { path: "/real-safe-templates", text: "Real path evidence" },
  {
    path: "/cms-wordpress-scanner",
    text: "WordPress and WooCommerce risk signals",
  },
  { path: "/retest-proof", text: "Show what improved" },
  {
    path: "/authenticated-scan",
    text: "Safe foundation for login-protected page review",
  },
  {
    path: "/international-security-engine",
    text: "Advanced backend foundation",
  },
  { path: "/attack-surface-discovery", text: "Discover the website surface" },
  {
    path: "/api-security-scanner",
    text: "Discover and prioritize API security surfaces",
  },
  {
    path: "/browser-security-analyzer",
    text: "Review browser-side security controls",
  },
  { path: "/graphql-risk-analyzer", text: "Review GraphQL risk signals" },
  { path: "/audit-framework", text: "Inbuilt advanced security audit" },
  {
    path: "/vulnerability-intelligence",
    text: "Evidence-based vulnerability intelligence",
  },
  {
    path: "/ownership-verification",
    text: "Ownership verification before deeper scans",
  },
  { path: "/legal/terms", text: "Terms" },
  { path: "/legal/privacy", text: "Privacy" },
];

for (const publicPage of publicPages) {
  test(`public page works: ${publicPage.path}`, async ({ page }) => {
    await page.goto(publicPage.path, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.locator("body")).toContainText(publicPage.text);
  });
}

test("health endpoint works", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();

  const json = await response.json();
  expect(json.status).toBe("ok");
});
