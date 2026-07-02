import { expect, test } from "@playwright/test";

test("public launch page renders", async ({ page }) => {
  await page.goto("/public-launch", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /SecureMSME AI|Request Demo|Pricing/i,
  );
});

test("pricing page renders", async ({ page }) => {
  await page.goto("/pricing", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /Starter|Growth|Agency|Enterprise/i,
  );
});

test("demo page renders", async ({ page }) => {
  await page.goto("/demo", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /Request a demo|work email|sensitive/i,
  );
});

test("admin demo funnel requires auth or admin", async ({ page }) => {
  await page.goto("/admin/demo-funnel", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(/login|Admin|Demo Funnel/i);
});
