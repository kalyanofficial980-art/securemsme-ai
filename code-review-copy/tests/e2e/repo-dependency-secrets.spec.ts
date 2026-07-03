import { expect, test } from "@playwright/test";

test("repo security requires auth or renders shell", async ({ page }) => {
  await page.goto("/repo-security", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /login|Repository|Repo Security/i,
  );
});

test("admin repo security requires auth or admin", async ({ page }) => {
  await page.goto("/admin/repo-security", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /login|Admin|Repo Security/i,
  );
});
