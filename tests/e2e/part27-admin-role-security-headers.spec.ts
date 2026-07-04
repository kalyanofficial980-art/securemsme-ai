import { test, expect } from "@playwright/test";
import fs from "fs";

test.describe.configure({ timeout: 90_000 });

test.describe("part 27 admin role hardening and security headers", () => {
  test("supabase migration protects role and billing fields", async () => {
    const sql = fs.readFileSync("supabase/migrations/20260704000100_part27_admin_role_hardening.sql", "utf8");

    expect(sql).toMatch(/prevent_profile_privilege_self_update/i);
    expect(sql).toMatch(/Profile privilege and billing fields cannot be changed/i);
    expect(sql).toMatch(/service_role/i);
    expect(sql).toMatch(/revoke update/i);
    expect(sql).toMatch(/role/i);
    expect(sql).toMatch(/plan/i);
    expect(sql).toMatch(/subscription_status|billing_status/i);
  });

  test("next config includes HSTS and CSP", async () => {
    const config = fs.readFileSync("next.config.ts", "utf8");

    expect(config).toMatch(/Strict-Transport-Security/i);
    expect(config).toMatch(/max-age=63072000/i);
    expect(config).toMatch(/Content-Security-Policy/i);
    expect(config).toMatch(/frame-ancestors 'none'/i);
    expect(config).toMatch(/object-src 'none'/i);
    expect(config).toMatch(/https:\/\/\*\.supabase\.co/i);
    expect(config).toMatch(/wss:\/\/\*\.supabase\.co/i);
  });

  test("playwright final gate retries are disabled", async () => {
    const config = fs.readFileSync("playwright.config.ts", "utf8");
    expect(config).toMatch(/retries:\s*0/i);
  });

  test("runtime public page returns security headers", async ({ request }) => {
    const response = await request.get("/");

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(400);

    const headers = response.headers();

    expect(headers["strict-transport-security"] || "").toMatch(/max-age=(31536000|63072000)/i);
    expect(headers["content-security-policy"] || "").toMatch(/frame-ancestors 'none'/i);
    expect(headers["x-frame-options"] || "").toMatch(/deny/i);
    expect(headers["x-content-type-options"] || "").toMatch(/nosniff/i);
  });

  test("admin and billing routes still do not open publicly", async ({ page }) => {
    for (const route of ["/admin/users", "/admin/organizations", "/admin/manual-payments", "/admin/support-inbox"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(text).toMatch(/login|admin|access|forbidden|unauthorized|securemsme|dashboard/i);
      expect(text).not.toMatch(/admin access granted|role updated to admin|payment verified successfully|enterprise access granted/i);
    }
  });
});


