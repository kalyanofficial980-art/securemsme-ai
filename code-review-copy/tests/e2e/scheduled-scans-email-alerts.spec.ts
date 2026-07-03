import { expect, test } from "@playwright/test";

test("scheduled scans requires auth or renders shell", async ({ page }) => {
  await page.goto("/scheduled-scans", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(/login|Scheduled Scans/i);
});

test("admin scheduled scans requires auth or admin", async ({ page }) => {
  await page.goto("/admin/scheduled-scans", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /login|Admin|Scheduled Scans/i,
  );
});
