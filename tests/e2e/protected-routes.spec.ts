import { expect, test } from "@playwright/test";

const protectedPages = ["/dashboard", "/websites", "/admin"];

for (const path of protectedPages) {
  test(`protected page redirects when logged out: ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/login|dashboard/);
  });
}
