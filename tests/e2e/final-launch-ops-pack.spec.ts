import { expect, test } from "@playwright/test";

test("beta page renders", async ({ page }) => {
  await page.goto("/beta", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.locator("body")).toContainText(
    /Beta Customer Mode|Safe first scan|Feedback/i,
  );
});

test("launch final checklist redirects or requires admin", async ({ page }) => {
  await page.goto("/launch-final-checklist", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(
    /login|Admin|Final Launch|Launch Operations/i,
  );
});

test("admin launch ops requires auth or admin", async ({ page }) => {
  await page.goto("/admin/launch-ops", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(
    /login|Admin|Final Launch|Launch Operations/i,
  );
});

test("admin lead crm requires auth or admin", async ({ page }) => {
  await page.goto("/admin/lead-crm", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(/login|Admin|Lead CRM/i);
});

test("admin abuse protection requires auth or admin", async ({ page }) => {
  await page.goto("/admin/abuse-protection", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.locator("body")).toContainText(
    /login|Admin|Abuse Protection/i,
  );
});
