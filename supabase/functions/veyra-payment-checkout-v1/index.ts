import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.2.5";
import QRCode from "npm:qrcode@1.5.4";

const TEAM_SLUG = "kalyanofficial980-arts-projects";
const TEAM_ID = "team_vyWArADLVffTz2Izf0DaEwLd";
const PROJECT_NAME = "securemsme-ai-live";
const PROJECT_ID = "prj_H1Efu65n2exj17N6pQdYRFPh6wPK";
const EXPECTED_AUDIENCE = `https://vercel.com/${TEAM_SLUG}`;
const ALLOWED_ISSUERS = new Set([
  "https://oidc.vercel.com",
  `https://oidc.vercel.com/${TEAM_SLUG}`,
]);
const ALLOWED_ENVIRONMENTS = new Set(["production", "preview"]);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

const PLANS = {
  starter: { name: "Starter", amountInr: 999 },
  growth: { name: "Growth", amountInr: 2499 },
  agency: { name: "Agency", amountInr: 6999 },
} as const;

type PlanKey = keyof typeof PLANS;

function getSecretKey(): { key: string; legacy: boolean } {
  const secretMapRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretMapRaw) {
    try {
      const secretMap = JSON.parse(secretMapRaw) as Record<string, string>;
      const key = secretMap.default || Object.values(secretMap)[0];
      if (key) return { key, legacy: false };
    } catch {
      // Fall through to the legacy service role key during key migration.
    }
  }

  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return { key: legacy, legacy: true };
  throw new Error("Trusted database credential unavailable.");
}

function adminHeaders(extra: Record<string, string> = {}) {
  const { key, legacy } = getSecretKey();
  return {
    apikey: key,
    ...(legacy ? { Authorization: `Bearer ${key}` } : {}),
    ...extra,
  };
}

function json(status: number, value: unknown) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function decodePayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function verifyVercelOidc(req: Request) {
  const header = req.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) throw new Error("Missing trusted server proof.");
  const token = header.slice(7).trim();
  const unverified = decodePayload(token);
  const issuer = typeof unverified?.iss === "string" ? unverified.iss : null;
  if (!issuer || !ALLOWED_ISSUERS.has(issuer)) throw new Error("Untrusted token issuer.");

  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks`));
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: EXPECTED_AUDIENCE,
    algorithms: ["RS256"],
  });

  const environment = typeof payload.environment === "string" ? payload.environment : "";
  if (!ALLOWED_ENVIRONMENTS.has(environment)) throw new Error("Untrusted deployment environment.");
  const expectedSubject = `owner:${TEAM_SLUG}:project:${PROJECT_NAME}:environment:${environment}`;
  if (
    payload.sub !== expectedSubject ||
    payload.owner_id !== TEAM_ID ||
    payload.project_id !== PROJECT_ID
  ) {
    throw new Error("Untrusted deployment claims.");
  }
}

async function loadSettings() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/payment_settings_v1`);
  url.searchParams.set("id", "eq.primary");
  url.searchParams.set(
    "select",
    "payee_name,upi_enabled,upi_id,bank_enabled,bank_account_name,bank_name,bank_account_number,bank_ifsc,updated_at",
  );
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers: adminHeaders({ Accept: "application/json" }) });
  if (!response.ok) throw new Error("Payment settings lookup failed.");
  const rows = await response.json() as Array<Record<string, unknown>>;
  return rows[0] || null;
}

function buildUpiUri(upiId: string, payeeName: string, amountInr: number, planName: string) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amountInr.toFixed(2),
    cu: "INR",
    tn: `VeyraSec ${planName} monthly subscription`,
  });
  return `upi://pay?${params.toString()}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  if (!SUPABASE_URL) return json(500, { error: "Payment checkout unavailable." });

  try {
    await verifyVercelOidc(req);
    const body = await req.json() as { planKey?: string };
    const planKey = body.planKey as PlanKey;
    const plan = PLANS[planKey];
    if (!plan) return json(400, { error: "Invalid paid plan." });

    const settings = await loadSettings();
    if (!settings) {
      return json(200, {
        configured: false,
        planKey,
        planName: plan.name,
        amountInr: plan.amountInr,
      });
    }

    const payeeName = typeof settings.payee_name === "string" ? settings.payee_name.trim() : "VeyraSec";
    const upiEnabled = settings.upi_enabled === true && typeof settings.upi_id === "string" && settings.upi_id.trim().length > 0;
    const bankEnabled = settings.bank_enabled === true;
    const upiId = upiEnabled ? String(settings.upi_id).trim() : null;
    const upiUri = upiId ? buildUpiUri(upiId, payeeName, plan.amountInr, plan.name) : null;
    const qrSvg = upiUri
      ? await QRCode.toString(upiUri, {
          type: "svg",
          width: 288,
          margin: 2,
          errorCorrectionLevel: "M",
        })
      : null;

    return json(200, {
      configured: upiEnabled || bankEnabled,
      planKey,
      planName: plan.name,
      amountInr: plan.amountInr,
      payeeName,
      upiEnabled,
      upiId,
      upiUri,
      qrSvg,
      bankEnabled,
      bankAccountName: bankEnabled ? settings.bank_account_name || null : null,
      bankName: bankEnabled ? settings.bank_name || null : null,
      bankAccountNumber: bankEnabled ? settings.bank_account_number || null : null,
      bankIfsc: bankEnabled ? settings.bank_ifsc || null : null,
      settingsUpdatedAt: settings.updated_at || null,
    });
  } catch (error) {
    console.error("payment-checkout-v1", error instanceof Error ? error.message : "unknown error");
    return json(401, { error: "Trusted payment checkout authorization failed." });
  }
});
