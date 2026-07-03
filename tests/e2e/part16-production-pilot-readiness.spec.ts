import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const secretPattern =
  /service_role|supabase_service_role|sk_live_|sk_test_|razorpay_secret|stripe_secret|database url|postgres:\/\/|authorization:\s*bearer\s+[a-z0-9._-]{20,}|refresh_token|access_token|BEGIN RSA PRIVATE KEY|BEGIN PRIVATE KEY/i;

const sensitiveDataPattern =
  /customer_password|raw_cookie|session_token|credit card|aadhaar|pan number|internal admin note|private customer export|full database dump/i;

const unsafePilotClaim =
  /100% secure|guaranteed hack proof|guaranteed compliance|confirmed breach|data stolen|payment verified successfully|enterprise access granted|admin access granted|role updated to admin|all vulnerabilities found/i;

function expectPilotSafe(text: string) {
  expect(text).not.toMatch(secretPattern);
  expect(text).not.toMatch(sensitiveDataPattern);
  expect(text).not.toMatch(/reverse shell|meterpreter|sqlmap -|nmap -a|credential dump|exploit payload/i);

  const hasAbsoluteClaim = unsafePilotClaim.test(text);
  const isBlockedGuidance =
    /do not say|blocked .*claims|safe report limitations|do not claim|client-safe|evidence-backed|authorized use only/i.test(text);

  expect(
    !hasAbsoluteClaim || isBlockedGuidance,
    "absolute security/compliance/payment claims are allowed only as blocked guidance"
  ).toBeTruthy();

  const mentionsPrivateKey = /private keys?/i.test(text);
  const privateKeyIsSafetyGuidance =
    /no passwords, otps, private keys|do not send .*private keys?|not sending .*private keys?|credentials, private keys, tokens|authorized use only|safety|launch-safe/i.test(text);

  expect(
    !mentionsPrivateKey || privateKeyIsSafetyGuidance,
    "private key wording is allowed only as safety guidance"
  ).toBeTruthy();
}

test.describe("part 16 production pilot readiness and customer onboarding flow", () => {
  test("pilot-facing public journey pages render safely", async ({ page }) => {
    for (const route of [
      "/",
      "/pricing",
      "/demo",
      "/contact",
      "/support",
      "/trust",
      "/security",
      "/legal/terms",
      "/legal/privacy",
    ]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(text).toMatch(/securemsme|security|pricing|demo|contact|support|trust|legal|scan|report|pilot|onboarding|dashboard/i);
      expectPilotSafe(text);
    }
  });

  test("customer onboarding route sequence is reachable or safely protected", async ({ page }) => {
    for (const route of [
      "/onboarding",
      "/onboarding/first-scan",
      "/onboarding/success",
      "/organizations",
      "/websites/new",
      "/scan-authorization",
      "/ownership-verification",
    ]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(text).toMatch(/securemsme|onboarding|organization|website|scan|authorization|ownership|login|dashboard|security|permission|verify|access/i);
      expectPilotSafe(text);
    }
  });

  test("production pilot readiness pages use safe review-based language", async ({ page }) => {
    for (const route of [
      "/production-checklist",
      "/production-launch",
      "/launch-ready",
      "/beta",
      "/public-launch",
      "/legal/responsible-disclosure",
    ]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(text).toMatch(/securemsme|production|launch|pilot|beta|checklist|legal|responsible|security|login|dashboard|ready|safe/i);
      expect(text).not.toMatch(/launch without review|bypass legal approval|instant paid public launch|disable abuse protection/i);
      expectPilotSafe(text);
    }
  });

  test("fake pilot onboarding and launch APIs do not auto-activate customer access", async ({ request }) => {
    const checks = [
      { method: "POST", url: "/api/launch-analytics" },
      { method: "POST", url: "/api/pilot/onboard" },
      { method: "POST", url: "/api/onboarding/complete" },
      { method: "POST", url: "/api/demo/request" },
      { method: "POST", url: "/api/support/ticket" },
      { method: "GET", url: "/api/health" },
    ];

    for (const check of checks) {
      const response =
        check.method === "POST"
          ? await request.post(check.url, {
              timeout: 30_000,
              data: {
                email: "pilot-e2e@example.com",
                company: "E2E Pilot Company",
                plan: "enterprise",
                role: "admin",
                status: "paid",
                source: "part16-production-pilot-readiness",
              },
            })
          : await request.get(check.url, { timeout: 30_000 });

      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);

      const text = await response.text().catch(() => "");

      expectPilotSafe(text);
      expect(text).not.toMatch(/pilot activated successfully|enterprise access granted|admin access granted|payment verified successfully|role updated to admin/i);
    }
  });

  test("pilot public navigation does not expose admin or internal operations", async ({ page }) => {
    for (const route of ["/", "/pricing", "/demo", "/contact", "/support", "/trust", "/production-checklist"]) {
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
          /\/admin\/users|\/admin\/organizations|\/admin\/manual-payments|\/admin\/support-inbox|\/admin\/worker-queue|\/admin\/lead-crm\/export|service_role|api_key|apikey|secret|database url/
        );
      }
    }
  });
});
