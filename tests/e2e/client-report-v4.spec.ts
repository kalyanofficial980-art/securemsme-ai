import { expect, test } from "@playwright/test";

test("client report v4 public page works", async ({ page }) => {
  await page.goto("/client-report-v4", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText("Client Report v4");
  await expect(page.locator("body")).toContainText(
    "Executive Security Dashboard",
  );
});
