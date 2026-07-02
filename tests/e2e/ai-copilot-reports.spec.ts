import { expect, test } from "@playwright/test";

test("ai copilot requires auth or renders shell", async ({ page }) => {
  await page.goto("/ai-copilot", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(/login|AI Copilot/i);
});

test("admin ai copilot requires auth or admin", async ({ page }) => {
  await page.goto("/admin/ai-copilot", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(/login|Admin|AI Copilot/i);
});
