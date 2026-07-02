import { expect, test } from "@playwright/test";

test("accuracy foundation public page works", async ({ page }) => {
  await page.goto("/accuracy-foundation", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText("Advanced Finding Taxonomy");
  await expect(page.locator("body")).toContainText("99% Accuracy Foundation");
});
