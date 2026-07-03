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
const authReady = readEnvLocal("E2E_AUTH_READY") === "true";

const safePublicTarget = "https://kistkakutur.com";
const blockedTargets = [
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "http://0.0.0.0:3000",
  "http://10.0.0.1",
  "http://172.16.0.1",
  "http://192.168.1.1",
  "file:///etc/passwd",
];

async function login(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30_000 });

  await page.locator('input[type="email"], input[name="email"]').first().fill(email!);
  await page.locator('input[type="password"], input[name="password"]').first().fill(password!);
  await page.getByRole("button", { name: /login|log in|sign in|continue|submit/i }).first().click();

  await page.waitForURL(/dashboard|onboarding|websites|organizations/, { timeout: 30_000 });
}

test.describe("real scan execution hardening", () => {
  test("scan authorization page clearly requires permission before scanning", async ({ page }) => {
    await page.goto("/scan-authorization", { waitUntil: "domcontentloaded", timeout: 30_000 });

    await expect(page.locator("body")).toContainText(
      /authorized|authorization|permission|owner|ownership|scan|safe/i,
      { timeout: 20_000 }
    );

    await expect(page.locator("body")).not.toContainText(
      /exploit|bypass|steal|malware|credential theft|attack instructions/i
    );
  });

  test("scan API rejects private and local targets", async ({ request }) => {
    for (const target of blockedTargets) {
      const response = await request.post("/api/scan", {
        timeout: 30_000,
        data: {
          url: target,
          targetUrl: target,
          source: "e2e-private-target-block-check",
        },
      });

      const text = await response.text().catch(() => "");

      const safelyRejected =
        !response.ok() ||
        /blocked|private|localhost|loopback|invalid|not allowed|ssrf|permission|authorization|forbidden/i.test(text);

      expect(safelyRejected, `${target} must be blocked or safely rejected`).toBeTruthy();
      expect(text).not.toMatch(/scan started successfully|deep scan started|queued successfully/i);
    }
  });

  test("unauthenticated public scan request does not leak dangerous execution details", async ({ request }) => {
    const response = await request.post("/api/scan", {
      timeout: 30_000,
      data: {
        url: safePublicTarget,
        targetUrl: safePublicTarget,
        source: "e2e-unauth-public-scan-check",
      },
    });

    const text = await response.text().catch(() => "");

    expect([200, 201, 202, 400, 401, 403, 404, 405, 409, 422, 429, 500]).toContain(response.status());

    expect(text).not.toMatch(
      /nmap|masscan|sqlmap|metasploit|reverse shell|payload|exploit completed|command output|\/etc\/passwd/i
    );
  });

  test("logged-in user can reach scan shell safely", async ({ page }) => {
    test.skip(!authReady || !email || !password, "Real auth is not ready.");

    await login(page);

    await page.goto("/scan", { waitUntil: "domcontentloaded", timeout: 30_000 });

    await expect(page.locator("body")).toContainText(
      /scan|website|security|authorized|permission|dashboard|report|risk/i,
      { timeout: 30_000 }
    );

    await expect(page.locator("body")).not.toContainText(
      /exploit|steal|malware|reverse shell|credential theft/i
    );
  });

  test("saved website page exposes safe scan/report workflow only", async ({ page }) => {
    test.skip(!authReady || !email || !password, "Real auth is not ready.");

    await login(page);

    await page.goto("/websites/new", { waitUntil: "domcontentloaded", timeout: 30_000 });

    await expect(page.locator("body")).toContainText(/website|url|scan|save/i, {
      timeout: 20_000,
    });

    await page.evaluate((target) => {
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
      };

      setNativeValue(nameInput, "E2E Safe Scan Website");
      setNativeValue(urlInput, target);

      const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[];
      const button =
        buttons.find((btn) => /save website|add website|save|create/i.test(btn.innerText || btn.textContent || "")) ||
        buttons.find((btn) => (btn.type || "").toLowerCase() === "submit") ||
        buttons[buttons.length - 1];

      if (!button) throw new Error("Save button not found");
      button.click();
    }, safePublicTarget);

    await page.waitForTimeout(4000);

    await expect(page.locator("body")).toContainText(
      /kistkakutur\.com|safe scan website|scan|verify|report|website|saved/i,
      { timeout: 30_000 }
    );

    await expect(page.locator("body")).not.toContainText(
      /exploit|payload|reverse shell|credential theft|attack completed/i
    );
  });
});
