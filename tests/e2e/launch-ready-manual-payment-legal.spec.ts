import { expect, test } from "@playwright/test";

test("legal center page works", async ({ page }) => {
  await page.goto("/legal", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.locator("body")).toContainText("Legal Pages");
  await expect(page.locator("body")).toContainText("Terms and Conditions");
});

test("trust center page works", async ({ page }) => {
  await page.goto("/trust", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.locator("body")).toContainText("Trust Center");
  await expect(page.locator("body")).toContainText("Important limitations");
});

test("support page works", async ({ page }) => {
  await page.goto("/support", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText("Contact SecureMSME AI");
});

test("manual billing requires auth or renders billing", async ({ page }) => {
  await page.goto("/manual-billing", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(/login|Manual Billing/i);
});
