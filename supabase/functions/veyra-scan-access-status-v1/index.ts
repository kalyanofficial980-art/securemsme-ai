import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.2.5";

const TEAM_SLUG = "kalyanofficial980-arts-projects";
const TEAM_ID = "team_vyWArADLVffTz2Izf0DaEwLd";
const PROJECT_NAME = "securemsme-ai-live";
const PROJECT_ID = "prj_H1Efu65n2exj17N6pQdYRFPh6wPK";
const EXPECTED_ENVIRONMENT = "production";
const EXPECTED_AUDIENCE = `https://vercel.com/${TEAM_SLUG}`;
const EXPECTED_SUBJECT = `owner:${TEAM_SLUG}:project:${PROJECT_NAME}:environment:${EXPECTED_ENVIRONMENT}`;
const ALLOWED_ISSUERS = new Set([
  "https://oidc.vercel.com",
  `https://oidc.vercel.com/${TEAM_SLUG}`,
]);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

function getSecretKey(): { key: string; legacy: boolean } {
  const secretMapRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretMapRaw) {
    try {
      const secretMap = JSON.parse(secretMapRaw) as Record<string, string>;
      const key = secretMap.default || Object.values(secretMap)[0];
      if (key) return { key, legacy: false };
    } catch {
      // Fall through to legacy service-role key during key migration.
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

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function decodeIssuer(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    return typeof payload?.iss === "string" ? payload.iss : null;
  } catch {
    return null;
  }
}

async function verifyVercelOidc(req: Request) {
  const header = req.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) throw new Error("Missing trusted server proof.");
  const token = header.slice(7).trim();
  const issuer = decodeIssuer(token);
  if (!issuer || !ALLOWED_ISSUERS.has(issuer)) throw new Error("Untrusted token issuer.");

  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks`));
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: EXPECTED_AUDIENCE,
    subject: EXPECTED_SUBJECT,
    algorithms: ["RS256"],
  });

  if (payload.owner_id !== TEAM_ID || payload.project_id !== PROJECT_ID || payload.environment !== EXPECTED_ENVIRONMENT) {
    throw new Error("Untrusted deployment claims.");
  }
}

async function websiteBelongsToUser(websiteId: string, userId: string) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/websites`);
  url.searchParams.set("id", `eq.${websiteId}`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("select", "id");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers: adminHeaders({ Accept: "application/json" }) });
  if (!response.ok) throw new Error("Website lookup failed.");
  const rows = await response.json() as Array<{ id: string }>;
  return Boolean(rows[0]?.id);
}

async function recordStatus(body: Record<string, unknown>) {
  const userId = body.user_id;
  const websiteId = body.website_id;
  const status = body.status;

  if (!isUuid(userId) || !isUuid(websiteId) || !["verified", "blocked", "error"].includes(String(status))) {
    return json(400, { error: "Invalid Scan Access status update." });
  }

  if (!(await websiteBelongsToUser(websiteId, userId))) {
    return json(404, { error: "Website not found." });
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    scan_access_last_status: status,
    updated_at: now,
  };
  if (status === "verified") patch.scan_access_last_verified_at = now;

  const url = new URL(`${SUPABASE_URL}/rest/v1/websites`);
  url.searchParams.set("id", `eq.${websiteId}`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("scan_access_enabled", "eq.true");
  const response = await fetch(url, {
    method: "PATCH",
    headers: adminHeaders({
      "content-type": "application/json",
      Prefer: "return=minimal",
    }),
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error("Trusted Scan Access status persistence failed.");

  return json(200, { ok: true });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  if (!SUPABASE_URL) return json(500, { error: "Trusted gateway unavailable." });

  try {
    await verifyVercelOidc(req);
    const body = await req.json() as Record<string, unknown>;
    return await recordStatus(body);
  } catch (error) {
    console.error("veyra-scan-access-status-v1", error instanceof Error ? error.message : "unknown error");
    return json(401, { error: "Trusted server authorization failed." });
  }
});
