import { test, expect, Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function readEnvLocal(name: string) {
  if (process.env[name]) return process.env[name];

  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return undefined;

  const text = readFileSync(envPath, "utf8");
  const line = text
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith(`${name}=`));

  if (!line) return undefined;

  return line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
}

const email = readEnvLocal("E2E_EMAIL");
const password = readEnvLocal("E2E_PASSWORD");
const authReady = readEnvLocal("E2E_AUTH_READY") === "true";

async function fillAuthForm(page: Page) {
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email!);

  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(password!);
}

async function submitAuth(page: Page) {
  const button = page.getByRole("button", { name: /login|log in|sign in|continue|submit/i }).first();
  await expect(button).toBeVisible({ timeout: 10000 });
  await button.click();
}

test.describe("real auth journey", () => {
  test("signup page renders", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveURL(/signup/);
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });

  test("test user can login and reach dashboard", async ({ page }) => {
    test.skip(
      !authReady || !email || !password,
      "Real auth E2E disabled until E2E_AUTH_READY=true and valid Supabase E2E user exists."
    );

    await page.goto("/login");

    await fillAuthForm(page);
    await submitAuth(page);

    const loginError = page.getByText(
      /invalid login credentials|email not confirmed|unable to login|login failed|invalid/i
    );

    await Promise.race([
      page.waitForURL(/dashboard|onboarding|websites|organizations/, { timeout: 25000 }),
      loginError.waitFor({ state: "visible", timeout: 8000 }).then(async () => {
        const text = await loginError.textContent();
        throw new Error(`Login failed before redirect: ${text || "auth error"}`);
      }),
    ]);

    await expect(page.locator("body")).toContainText(
      /dashboard|website|organization|onboarding|scan/i,
      { timeout: 15000 }
    );
  });
});
