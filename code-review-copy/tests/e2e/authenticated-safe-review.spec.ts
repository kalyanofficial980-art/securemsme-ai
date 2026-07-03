import { expect, test } from "@playwright/test";

test("authenticated safe review public page works", async ({ page }) => {
  await page.goto("/authenticated-safe-review", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    "Authenticated Safe Review v2",
  );
  await expect(page.locator("body")).toContainText("No password storage");
});
