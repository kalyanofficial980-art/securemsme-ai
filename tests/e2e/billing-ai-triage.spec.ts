import { expect, test } from "@playwright/test";

test("billing ai triage public page works", async ({ page }) => {
  await page.goto("/billing-ai-triage", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText("Billing + AI Triage");
  await expect(page.locator("body")).toContainText("Usage Limits");
});
