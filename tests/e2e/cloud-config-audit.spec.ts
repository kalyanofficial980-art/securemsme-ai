import { expect, test } from "@playwright/test";

test("cloud config audit requires auth or renders shell", async ({ page }) => {
  await page.goto("/cloud-config-audit", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(/login|Cloud Config/i);
});

test("admin cloud config audit requires auth or admin", async ({ page }) => {
  await page.goto("/admin/cloud-config-audit", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(/login|Admin|Cloud Config/i);
});
