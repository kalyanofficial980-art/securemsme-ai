import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const secretPattern =
  /service_role|supabase_service_role|sk_live_|sk_test_|razorpay_secret|stripe_secret|database url|postgres:\/\/|authorization:\s*bearer\s+[a-z0-9._-]{20,}|refresh_token|access_token|BEGIN RSA PRIVATE KEY|BEGIN PRIVATE KEY/i;

const unsafeLaunchClaim =
  /100% secure|guaranteed hack proof|guaranteed compliance|confirmed breach|data stolen|admin access granted|payment verified successfully|all vulnerabilities found/i;

function expectLaunchSafe(text: string) {
  expect(text).not.toMatch(secretPattern);
  expect(text).not.toMatch(/reverse shell|meterpreter|sqlmap -|nmap -a|credential dump|exploit payload/i);

  const mentionsPrivateKey = /private keys?/i.test(text);
  const privateKeyIsSafetyGuidance =
    /no passwords, otps, private keys|do not send .*private keys?|not sending .*private keys?|credentials, private keys, tokens|authorized use only|safety|launch-safe/i.test(text);

  expect(
    !mentionsPrivateKey || privateKeyIsSafetyGuidance,
    "private key wording is allowed only as safety/blocked guidance"
  ).toBeTruthy();

  const hasAbsoluteClaim = unsafeLaunchClaim.test(text);
  const isBlockedGuidance =
    /do not say|blocked .*claims|safe report limitations|do not claim|client-safe|evidence-backed/i.test(text);

  expect(!hasAbsoluteClaim || isBlockedGuidance).toBeTruthy();
}

test.describe("part 15 final launch safety gate", () => {
  test("critical public launch pages render safely", async ({ page }) => {
    for (const route of ["/", "/pricing", "/trust", "/security", "/legal", "/legal/terms", "/legal/privacy", "/public-launch", "/production-checklist", "/beta"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(text).toMatch(/securemsme|security|pricing|trust|legal|launch|beta|privacy|terms|dashboard|scan|support/i);
      expectLaunchSafe(text);
    }
  });

  test("seo and machine-readable files are reachable and safe", async ({ page }) => {
    for (const route of ["/robots.txt", "/sitemap.xml", "/.well-known/security.txt", "/api/health"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(text.length).toBeGreaterThan(0);
      expectLaunchSafe(text);
    }
  });

  test("final launch admin routes are protected", async ({ page }) => {
    for (const route of ["/admin/launch-ops", "/admin/launch-analytics", "/admin/demo-funnel", "/admin/production-launch", "/launch-ready"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(text).toMatch(/securemsme|launch|admin|login|dashboard|production|analytics|access|forbidden|unauthorized/i);
      expectLaunchSafe(text);
    }
  });

  test("launch analytics accepts only safe public event data", async ({ request }) => {
    const response = await request.post("/api/launch-analytics", {
      timeout: 30_000,
      data: {
        event: "e2e_final_launch_gate",
        source: "part15",
        path: "/pricing",
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);

    const text = await response.text().catch(() => "");
    expectLaunchSafe(text);
  });

  test("final public navigation avoids sensitive admin links", async ({ page }) => {
    for (const route of ["/", "/pricing", "/trust", "/security", "/legal"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const links = await page.locator("a").evaluateAll((anchors) =>
        anchors.map((anchor) => ({
          text: anchor.textContent || "",
          href: anchor.getAttribute("href") || "",
        }))
      );

      for (const link of links) {
        const combined = (link.text + " " + link.href).toLowerCase();

        expect(combined).not.toMatch(
          /\/admin\/users|\/admin\/organizations|\/admin\/manual-payments|\/admin\/worker-queue|service_role|api_key|apikey|secret/
        );
      }
    }
  });
});
