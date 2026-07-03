import { expect, test } from "@playwright/test";

test("monitoring pro public page works", async ({ page }) => {
  await page.goto("/monitoring-pro", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText("Monitoring Pro");
  await expect(page.locator("body")).toContainText("Agency SOC");
});

test("agency soc requires auth or renders dashboard shell", async ({
  page,
}) => {
  await page.goto("/agency-soc", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /login|Agency SOC|Dashboard/i,
  );
});
