import { expect, test } from "@playwright/test";

const publicPages = [
  { path: "/", text: "SecureMSME AI" },
  { path: "/pricing", text: "Pricing" },
  { path: "/trust", text: "Trust" },
  { path: "/security", text: "Security" },
  { path: "/legal", text: "Legal" },
  { path: "/tools", text: "Built-in cybersecurity tools" },
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
