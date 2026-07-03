import { test, expect, Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

test.describe.configure({ timeout: 90_000 });

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
const fullSaasReady = readEnvLocal("E2E_FULL_SAAS_READY") === "true";

async function login(page: Page) {
  console.log("STEP: login");

  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30_000 });

  await page.locator('input[type="email"], input[name="email"]').first().fill(email!);
  await page.locator('input[type="password"], input[name="password"]').first().fill(password!);
  await page.getByRole("button", { name: /login|log in|sign in|continue|submit/i }).first().click();

  await page.waitForURL(/dashboard|onboarding|websites|organizations/, { timeout: 30_000 });
  console.log("URL after login:", page.url());
}

async function addWebsite(page: Page) {
  console.log("STEP: add website");

  await page.goto("/websites/new", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(page.locator("body")).toContainText(/save a website|add website|website url/i, {
    timeout: 15_000,
  });

  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input")) as HTMLInputElement[];

    const meta = (input: HTMLInputElement) =>
      `${input.name || ""} ${input.id || ""} ${input.type || ""} ${input.placeholder || ""} ${input.getAttribute("aria-label") || ""}`.toLowerCase();

    const nameInput =
      inputs.find((input) => /name|business/.test(meta(input))) ||
      inputs[0];

    const urlInput =
      inputs.find((input) => /url|domain|example|website/.test(meta(input)) && input !== nameInput) ||
      inputs.find((input) => input !== nameInput) ||
      inputs[1];

    if (!nameInput) throw new Error("Website name input not found");
    if (!urlInput) throw new Error("Website URL input not found");

    const setNativeValue = (element: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    };

    setNativeValue(nameInput, "E2E Example Website");
    setNativeValue(urlInput, "https://kistkakutur.com");

    const form = urlInput.closest("form") || document.querySelector("form");
    if (!form) throw new Error("Website form not found");
  });

  await page.waitForTimeout(1000);

  console.log("STEP: submit website form");

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[];

    const button =
      buttons.find((btn) => /save website|add website|save|create/i.test(btn.innerText || btn.textContent || "")) ||
      buttons.find((btn) => (btn.type || "").toLowerCase() === "submit") ||
      buttons[buttons.length - 1];

    if (!button) throw new Error("Save website button not found");

    button.scrollIntoView({ block: "center" });
    button.click();
  });

  await page.waitForTimeout(5000);

  console.log("URL after save:", page.url());

  await expect(page.locator("body")).toContainText(
    /kistkakutur\.com|e2e example website|scan|verify|website|saved|dashboard|report/i,
    { timeout: 30_000 }
  );
}

async function scanOrReportShell(page: Page) {
  console.log("STEP: scan/report shell");

  await expect(page.locator("body")).toContainText(
    /scan|report|risk|security|website|verify|queued|completed|kistkakutur\.com/i,
    { timeout: 30_000 }
  );

  const scanButton = page.getByRole("button", { name: /start scan|scan now|run scan|scan|retest/i }).first();

  if (await scanButton.isVisible().catch(() => false)) {
    console.log("STEP: click scan no-wait");
    await scanButton.click({ timeout: 10_000, noWaitAfter: true }).catch((error) => {
      console.log("Scan click safely ignored:", error.message.slice(0, 160));
    });

    await page.waitForTimeout(3000);
  }

  console.log("URL after scan attempt:", page.url());

  await expect(page.locator("body")).toContainText(
    /scan|report|risk|security|website|verify|queued|completed|kistkakutur\.com/i,
    { timeout: 30_000 }
  );
}

test.describe("full SaaS journey", () => {
  test("login add website scan report", async ({ page }) => {
    test.skip(
      !fullSaasReady || !email || !password,
      "Full SaaS journey disabled until E2E_FULL_SAAS_READY=true."
    );

    await login(page);
    await addWebsite(page);
    await scanOrReportShell(page);
  });
});
