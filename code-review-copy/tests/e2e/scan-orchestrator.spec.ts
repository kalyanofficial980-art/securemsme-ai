import { expect, test } from "@playwright/test";

test("scan orchestrator public page works", async ({ page }) => {
  await page.goto("/scan-orchestrator", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText("Scan Orchestrator v2");
  await expect(page.locator("body")).toContainText("Engine Execution Pipeline");
});
