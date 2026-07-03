import { test, expect } from "@playwright/test";

test("contact support page renders", async ({ page }) => {
  await page.goto("/contact", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  const body = page.locator("body");

  await expect(body).toContainText(/Contact SecureMSME AI Support|SecureMSME AI Support/i);
  await expect(body).toContainText(/Submit ticket/i);
  await expect(body).toContainText(/Do not send credentials|private keys|tokens|OTP/i);
  await expect(body).toContainText(/Safety/i);
});

test("support redirects to contact", async ({ page }) => {
  await page.goto("/support", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  const body = page.locator("body");

  await expect(body).toContainText(/Contact SecureMSME AI Support|SecureMSME AI Support/i);
  await expect(body).toContainText(/Submit ticket/i);
  await expect(body).toContainText(/Do not send credentials|private keys|tokens|OTP/i);
  await expect(body).toContainText(/Safety/i);
});
