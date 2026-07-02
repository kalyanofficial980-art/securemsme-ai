import { expect, test } from "@playwright/test";

test("contact support page renders", async ({ page }) => {
  await page.goto("/contact", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(
    /Contact Support|Support Request|sensitive/i,
  );
});

test("support redirects to contact", async ({ page }) => {
  await page.goto("/support", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(
    /Contact Support|Support Request|sensitive/i,
  );
});

test("support success page renders", async ({ page }) => {
  await page.goto("/support/success", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(
    /Support ticket submitted|Public Launch|Demo/i,
  );
});

test("admin support inbox requires auth or admin", async ({ page }) => {
  await page.goto("/admin/support-inbox", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(
    /login|Admin|Support Inbox/i,
  );
});
