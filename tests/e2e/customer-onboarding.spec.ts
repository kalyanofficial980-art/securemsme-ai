import { expect, test } from "@playwright/test";

test("onboarding requires auth or renders onboarding shell", async ({
  page,
}) => {
  await page.goto("/onboarding", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /login|Onboarding|Customer/i,
  );
});

test("first scan onboarding requires auth or renders shell", async ({
  page,
}) => {
  await page.goto("/onboarding/first-scan", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /login|First scan|Onboarding/i,
  );
});

test("admin onboarding requires auth or admin", async ({ page }) => {
  await page.goto("/admin/onboarding", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(/login|Admin|Onboarding/i);
});
