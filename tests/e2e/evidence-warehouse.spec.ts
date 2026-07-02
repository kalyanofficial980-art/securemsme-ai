import { expect, test } from "@playwright/test";

test("evidence warehouse public page works", async ({ page }) => {
  await page.goto("/evidence-warehouse", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText("Evidence Warehouse v2");
  await expect(page.locator("body")).toContainText("Proof Chain System");
});
