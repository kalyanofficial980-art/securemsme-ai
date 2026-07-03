import { expect, test } from "@playwright/test";

test("developer portal public page works", async ({ page }) => {
  await page.goto("/developer-portal", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText("Developer Portal");
  await expect(page.locator("body")).toContainText("Fix Collaboration");
});
