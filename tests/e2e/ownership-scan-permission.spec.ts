import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const fakeWebsiteId = "00000000-0000-4000-8000-000000000000";

test.describe("ownership verification and scan permission hardening", () => {
  test("ownership and scan authorization public pages explain safe permission model", async ({ page }) => {
    for (const route of ["/ownership-verification", "/scan-authorization"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      await expect(page.locator("body")).toContainText(
        /ownership|verify|verification|authorization|permission|authorized|safe|scan/i,
        { timeout: 20_000 }
      );

      await expect(page.locator("body")).not.toContainText(
        /attack|exploit|steal|bypass|malware|credential theft/i
      );
    }
  });

  test("logged out users cannot open website management as an active verified workspace", async ({ page }) => {
    const protectedWebsitePages = [
      "/websites/new",
      `/websites/${fakeWebsiteId}`,
      `/websites/${fakeWebsiteId}/verify`,
    ];

    for (const route of protectedWebsitePages) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const url = page.url().toLowerCase();
      const body = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      const isSafelyBlocked =
        url.includes("/login") ||
        url.includes("/signup") ||
        /login|sign in|auth|unauthorized|not found|verify|permission|ownership/i.test(body);

      expect(isSafelyBlocked, `${route} must require auth, ownership, or safe verification state`).toBeTruthy();

      expect(body).not.toMatch(/deep scan started|scan started successfully|verified owner/i);
    }
  });

  test("unauthenticated mutation scan APIs do not start website scans", async ({ request }) => {
    const mutationRoutes = [
      `/api/websites/${fakeWebsiteId}/deep-scan`,
      `/api/websites/${fakeWebsiteId}/rescan`,
    ];

    for (const route of mutationRoutes) {
      const response = await request.post(route, {
        timeout: 30_000,
        data: {
          reason: "e2e-unauthenticated-permission-check",
        },
      });

      expect(
        [400, 401, 403, 404, 405, 409, 422, 429].includes(response.status()),
        `${route} returned ${response.status()} but must not allow unauthenticated scan mutation`
      ).toBeTruthy();

      const text = await response.text().catch(() => "");
      expect(text).not.toMatch(/deep scan started|scan started successfully|queued successfully/i);
    }
  });

  test("public scan endpoint blocks private localhost targets", async ({ request }) => {
    const response = await request.post("/api/scan", {
      timeout: 30_000,
      data: {
        url: "http://127.0.0.1:1",
        targetUrl: "http://127.0.0.1:1",
      },
    });

    const text = await response.text().catch(() => "");

    const safelyBlocked =
      !response.ok() ||
      /blocked|private|localhost|loopback|invalid|not allowed|ssrf|permission|authorization/i.test(text);

    expect(safelyBlocked, "localhost/private scan target must be blocked or safely rejected").toBeTruthy();
    expect(text).not.toMatch(/scan started successfully|deep scan started|queued successfully/i);
  });
});
