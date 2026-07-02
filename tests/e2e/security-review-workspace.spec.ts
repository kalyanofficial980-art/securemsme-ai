import { expect, test } from "@playwright/test";

test("security review workspace public page works", async ({ page }) => {
  await page.goto("/security-review-workspace", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    "Security Review Workspace + Bug Lifecycle Dashboard",
  );
});

test("reviews page requires auth or renders workspace shell", async ({
  page,
}) => {
  await page.goto("/reviews", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.locator("body")).toContainText(
    /login|Security Review Workspaces|Please login/i,
  );
});
