import { expect, test } from "@playwright/test";

test("advanced crawler public page works", async ({ page }) => {
  await page.goto("/advanced-crawler", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    "Advanced Crawler + Asset Discovery v2",
  );
  await expect(page.locator("body")).toContainText("Safe same-origin crawling");
});
