import { test, expect } from "@playwright/test";

test("public pages load", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/SecureMSME|Cyber|MSME|Security/i);

  await page.goto("/login");
  await expect(page.locator("body")).toContainText(/login|sign in|email/i);

  await page.goto("/trust");
  await expect(page.locator("body")).toContainText(/trust|security|authorized|guarantee/i);

  await page.goto("/pricing");
  await expect(page.locator("body")).toContainText(/pricing|plan|starter|growth|manual/i);
});

test("protected pages do not open publicly", async ({ page }) => {
  const protectedPages = ["/scan", "/dashboard", "/websites", "/admin"];

  for (const route of protectedPages) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");

    const url = page.url().toLowerCase();
    const body = (await page.locator("body").innerText()).toLowerCase();

    expect(
      url.includes("/login") ||
      body.includes("login") ||
      body.includes("please login") ||
      body.includes("sign in")
    ).toBeTruthy();
  }
});

test("security.txt exists", async ({ page }) => {
  const response = await page.goto("/.well-known/security.txt");
  expect(response?.status()).toBe(200);

  const body = await page.locator("body").innerText();
  expect(body).toContain("Contact:");
  expect(body).toContain("Policy:");
});

test("security headers are present", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(500);

  const headers = response?.headers() || {};

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBeTruthy();
  expect(headers["permissions-policy"]).toBeTruthy();
  expect(headers["x-frame-options"]).toBeTruthy();
  expect(headers["strict-transport-security"]).toBeTruthy();
  expect(headers["content-security-policy"]).toBeTruthy();
});
