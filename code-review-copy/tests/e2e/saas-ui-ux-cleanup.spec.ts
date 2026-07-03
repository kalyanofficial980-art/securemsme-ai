import { expect, test } from "@playwright/test";

test("public launch has clean SaaS copy", async ({ page }) => {
  await page.goto("/public-launch", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(
    /Security reviews for MSMEs|Request demo|Launch-safe/i,
  );
});

test("contact support has clean SaaS heading", async ({ page }) => {
  await page.goto("/contact", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(
    /Contact SecureMSME AI Support|Submit ticket/i,
  );
});

test("pricing has simplified launch pricing copy", async ({ page }) => {
  await page.goto("/pricing", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(
    /Simple launch pricing|Starter|Growth|Agency/i,
  );
});
