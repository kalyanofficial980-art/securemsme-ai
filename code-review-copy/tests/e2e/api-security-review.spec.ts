import { expect, test } from "@playwright/test";

test("api security review public page works", async ({ page }) => {
  await page.goto("/api-security-review", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText("API Security Review v2");
  await expect(page.locator("body")).toContainText("OpenAPI/Swagger discovery");
});
