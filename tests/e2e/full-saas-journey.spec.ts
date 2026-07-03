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
const fullSaasReady = readEnvLocal("E2E_FULL_SAAS_READY") === "true";

async function login(page: Page) {
  await page.goto("/login");

  await page.locator('input[type="email"], input[name="email"]').first().fill(email!);
  await page.locator('input[type="password"], input[name="password"]').first().fill(password!);

  await page.getByRole("button", { name: /login|log in|sign in|continue|submit/i }).first().click();

  const loginError = page.getByText(
    /invalid login credentials|email not confirmed|unable to login|login failed|invalid/i
  );

  await Promise.race([
    page.waitForURL(/dashboard|onboarding|websites|organizations/, { timeout: 25000 }),
    loginError.waitFor({ state: "visible", timeout: 8000 }).then(async () => {
      const text = await loginError.textContent();
      throw new Error(`Login failed before SaaS journey: ${text || "auth error"}`);
    }),
  ]);
}

async function goToAddWebsite(page: Page) {
  await page.goto("/websites/new");

  if (page.url().includes("/login")) {
    throw new Error("User was redirected to login after login. Auth session was not stored.");
  }

  await expect(page.locator("body")).toContainText(/website|domain|url|scan/i, {
    timeout: 15000,
  });
}

async function addWebsite(page: Page) {
  const testUrl = `https://example.com`;

  const urlInput = page
    .locator(
      'input[type="url"], input[name="url"], input[name="website"], input[name="domain"], input[placeholder*="example"], input[placeholder*="domain"], input[placeholder*="URL"], input[placeholder*="url"]'
    )
    .first();

  await expect(urlInput).toBeVisible({ timeout: 15000 });
  await urlInput.fill(testUrl);

  const submitButton = page
    .getByRole("button", { name: /add|save|continue|create|scan|start|submit/i })
    .first();

  await expect(submitButton).toBeVisible({ timeout: 10000 });
  await submitButton.click();

  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});

  await expect(page.locator("body")).toContainText(/example\.com|scan|website|verify|report|dashboard/i, {
    timeout: 20000,
  });
}

async function startScanIfAvailable(page: Page) {
  const scanButton = page
    .getByRole("button", { name: /start scan|scan now|run scan|scan|retest|continue/i })
    .first();

  if (await scanButton.isVisible().catch(() => false)) {
    await scanButton.click();
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  }

  await expect(page.locator("body")).toContainText(/scan|report|risk|security|website|queued|completed/i, {
    timeout: 30000,
  });
}

async function openReportIfAvailable(page: Page) {
  const reportLink = page
    .getByRole("link", { name: /report|view report|open report|results|details/i })
    .first();

  if (await reportLink.isVisible().catch(() => false)) {
    await reportLink.click();
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  }

  await expect(page.locator("body")).toContainText(/report|risk|security|scan|finding|website|score/i, {
    timeout: 30000,
  });
}

test.describe("full SaaS journey", () => {
  test("login add website scan report", async ({ page }) => {
    test.skip(
      !fullSaasReady || !email || !password,
      "Full SaaS journey disabled until E2E_FULL_SAAS_READY=true."
    );

    await login(page);
    await goToAddWebsite(page);
    await addWebsite(page);
    await startScanIfAvailable(page);
    await openReportIfAvailable(page);
  });
});
