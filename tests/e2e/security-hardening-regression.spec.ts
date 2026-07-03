import { expect, test } from "@playwright/test";

const adminRoutes = [
  "/admin/launch-ops",
  "/admin/lead-crm",
  "/admin/support-inbox",
  "/admin/abuse-protection",
  "/admin/launch-analytics",
  "/admin/demo-funnel",
];

for (const route of adminRoutes) {
  test("admin route is protected: " + route, async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(page.url().includes("/login") || body.includes("admin access required") || body.includes("please login")).toBeTruthy();
  });
}

test("public report navigation does not expose admin operation links", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const html = await page.content();
  expect(html).not.toContain('href="/admin/launch-ops"');
});
