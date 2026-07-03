import { expect, Page, APIRequestContext } from "@playwright/test";

const secretPattern =
  /service_role|supabase_service_role|sk_live_|sk_test_|razorpay_secret|stripe_secret|webhook_secret|database url|postgres:\/\/|authorization:\s*bearer\s+[a-z0-9._-]{20,}|refresh_token|access_token|BEGIN RSA PRIVATE KEY|BEGIN PRIVATE KEY/i;

const sensitivePattern =
  /customer_password|raw_cookie|session_token|credit card|aadhaar|pan number|internal admin note|full database dump|card_cvv|bank password/i;

const exploitPattern =
  /reverse shell|meterpreter|sqlmap -|nmap -a|masscan|credential dump|\/etc\/passwd|powershell -enc|cmd\.exe/i;

const hardUnsafeClaimPattern =
  /payment verified successfully|enterprise access granted|admin access granted|role updated to admin|subscription activated successfully|plan upgraded successfully/i;

const softUnsafeClaimPattern =
  /100% secure|guaranteed hack proof|guaranteed compliance|confirmed breach|data stolen|all vulnerabilities found/i;

export const fakeId = "00000000-0000-4000-8000-000000000099";

export function expectSafeText(text: string) {
  expect(text.length).toBeGreaterThan(0);
  expect(text).not.toMatch(secretPattern);
  expect(text).not.toMatch(sensitivePattern);
  expect(text).not.toMatch(exploitPattern);
  expect(text).not.toMatch(hardUnsafeClaimPattern);

  const mentionsExploitPayload = /exploit payloads?/i.test(text);
  const exploitPayloadIsGuidance =
    /no exploit payload|do not .*exploit payload|blocked .*exploit payload|without exploit payload|blocked actions|blocked claims|safe|safety/i.test(text);

  expect(
    !mentionsExploitPayload || exploitPayloadIsGuidance,
    "exploit payload wording is allowed only as blocked/safety guidance"
  ).toBeTruthy();

  const hasSoftUnsafeClaim = softUnsafeClaimPattern.test(text);
  const softClaimIsGuidance =
    /do not say|do not claim|do not include|no confirmed evidence|without confirmed evidence|blocked .*claims|safe report limitations|client-safe|evidence-backed|authorized use only|launch-safe|safety|not claim|avoid .*claim/i.test(text);

  expect(
    !hasSoftUnsafeClaim || softClaimIsGuidance,
    "soft unsafe claims are allowed only as blocked/safety guidance"
  ).toBeTruthy();

  const mentionsPrivateKey = /private keys?/i.test(text);
  const privateKeyIsGuidance =
    /no passwords.*private keys?|do not send .*private keys?|not sending .*private keys?|credentials, private keys, tokens|authorized use only|launch-safe|safety/i.test(text);

  expect(
    !mentionsPrivateKey || privateKeyIsGuidance,
    "private key wording is allowed only as safety guidance"
  ).toBeTruthy();
}

export async function expectRouteSafe(page: Page, route: string, mustMatch: RegExp) {
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const text = await page.locator("body").innerText({ timeout: 20_000 }).catch(() => "");
  expect(text).toMatch(mustMatch);
  expectSafeText(text);
  return text;
}

export async function expectApiSafe(
  request: APIRequestContext,
  method: "GET" | "POST",
  url: string,
  data: Record<string, unknown> = {}
) {
  const response =
    method === "POST"
      ? await request.post(url, { timeout: 30_000, data })
      : await request.get(url, { timeout: 30_000 });

  expect(response.status()).toBeGreaterThanOrEqual(200);
  expect(response.status()).toBeLessThan(600);

  const text = await response.text().catch(() => "");
  expectSafeText(text);
  return text;
}

export async function expectLinksSafe(page: Page, routes: string[]) {
  for (const route of routes) {
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
        /\/admin\/users|\/admin\/organizations|\/admin\/manual-payments|\/admin\/support-inbox|\/admin\/worker-queue|\/admin\/lead-crm\/export|service_role|api_key|apikey|database url/
      );
    }
  }
}
