import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const secretPattern =
  /service_role|sk_live_|sk_test_|razorpay_secret|stripe_secret|database url|postgres:\/\/|BEGIN RSA PRIVATE KEY|BEGIN PRIVATE KEY/i;

const paymentSuccessPattern =
  /subscription activated successfully|payment verified successfully|plan upgraded successfully|enterprise access granted|admin access granted|role updated to admin/i;

const sensitivePaymentPattern =
  /full card number|cvv|card_cvv|raw upi token|bank password|customer_password|refresh_token|access_token/i;

function expectSafeText(text: string) {
  expect(text).not.toMatch(secretPattern);
  expect(text).not.toMatch(paymentSuccessPattern);
  expect(text).not.toMatch(sensitivePaymentPattern);

  const mentionsPrivateKey = /private keys?/i.test(text);
  const privateKeyIsSafetyGuidance =
    /do not send .*private keys?|not sending .*private keys?|credentials, private keys, tokens|safety/i.test(text);

  expect(
    !mentionsPrivateKey || privateKeyIsSafetyGuidance,
    "private key wording is allowed only as safety guidance"
  ).toBeTruthy();
}

test.describe("billing and manual payment safety hardening", () => {
  test("pricing and support pages are safe", async ({ page }) => {
    for (const route of ["/pricing", "/billing-ai-triage", "/support", "/legal/terms", "/legal/privacy"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

      expect(text).toMatch(/securemsme|pricing|billing|payment|support|legal|plan|security|trust/i);
      expectSafeText(text);
    }
  });

  test("manual billing page is safe", async ({ page }) => {
    await page.goto("/manual-billing", { waitUntil: "domcontentloaded", timeout: 60_000 });

    const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

    expect(text).toMatch(/manual|billing|payment|invoice|support|login|dashboard|securemsme|security/i);
    expect(text).not.toMatch(/instant enterprise activation without review|fake payment accepted|bypass billing|pay now and get admin access/i);
    expectSafeText(text);
  });

  test("fake support success payment does not prove activation", async ({ page }) => {
    await page.goto("/support/success?payment_id=fake_e2e_payment&amount=999999&plan=enterprise", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");

    expect(text).toMatch(/support|success|securemsme|payment|message|contact|dashboard|security/i);
    expectSafeText(text);
  });

  test("fake billing APIs do not leak secrets or auto-upgrade", async ({ request }) => {
    const apiChecks = [
      { method: "POST", url: "/api/billing/manual-payment" },
      { method: "POST", url: "/api/manual-payments" },
      { method: "POST", url: "/api/payments/verify" },
      { method: "POST", url: "/api/checkout/create-session" },
      { method: "POST", url: "/api/razorpay/verify" },
      { method: "POST", url: "/api/billing/activate" },
      { method: "GET", url: "/api/billing/manual-payment?payment_id=fake_e2e_payment" },
    ];

    for (const check of apiChecks) {
      const response =
        check.method === "POST"
          ? await request.post(check.url, {
              timeout: 30_000,
              data: {
                payment_id: "fake_e2e_payment",
                order_id: "fake_e2e_order",
                amount: 999999,
                plan: "enterprise",
                status: "paid",
                role: "admin",
              },
            })
          : await request.get(check.url, { timeout: 30_000 });

      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(600);

      const text = await response.text().catch(() => "");

      expect(text).not.toMatch(secretPattern);
      expect(text).not.toMatch(paymentSuccessPattern);
      expect(text).not.toMatch(sensitivePaymentPattern);
    }
  });

  test("billing pages do not expose admin billing links", async ({ page }) => {
    for (const route of ["/pricing", "/billing-ai-triage", "/support"]) {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });

      const links = await page.locator("a").evaluateAll((anchors) =>
        anchors.map((anchor) => ({
          text: anchor.textContent || "",
          href: anchor.getAttribute("href") || "",
        }))
      );

      for (const link of links) {
        const combined = (link.text + " " + link.href).toLowerCase();

        expect(combined).not.toMatch(/\/admin\/users|\/admin\/organizations|\/admin\/billing|\/admin\/payments|service_role|razorpay_secret|stripe_secret|api_key|apikey|secret/);
      }
    }
  });
});
