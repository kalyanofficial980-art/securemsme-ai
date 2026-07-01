import { expect, test } from "@playwright/test";

const protectedPages = [
  "/dashboard",
  "/websites",
  "/admin",
  "/audit/import",
  "/audit/evidence-history",
];

for (const path of protectedPages) {
  test(`protected page redirects when logged out: ${path}`, async ({
    page,
  }) => {
    await page.goto(path, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page).toHaveURL(/login|dashboard/);
  });
}
