import { expect, test } from "@playwright/test";

const protectedRoutes = ["/dashboard", "/admin"];

for (const route of protectedRoutes) {
  test(`protected page redirects when logged out: ${route}`, async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto(route, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page).toHaveURL(/login|dashboard/);
  });
}
