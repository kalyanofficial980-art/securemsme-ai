import { expect, test } from "@playwright/test";

test("retest client portal pro public page works", async ({ page }) => {
  await page.goto("/retest-client-portal-pro", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(
    "Retest + Client Portal Pro",
  );
  await expect(page.locator("body")).toContainText("Verified Fix Proof");
});
