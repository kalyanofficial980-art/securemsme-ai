import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.2.5";
import QRCode from "npm:qrcode@1.5.4";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

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
const PAYMENT_PROOF_BUCKET = "payment-proofs";
const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;

const PLANS = {
  starter: { name: "Starter", amountInr: 999 },
  growth: { name: "Growth", amountInr: 2499 },
  agency: { name: "Agency", amountInr: 6999 },
} as const;

type PlanKey = keyof typeof PLANS;
type ProofMime = "image/png" | "image/jpeg" | "image/webp";

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

function adminClient() {
  const { key } = getSecretKey();
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function json(status: number, value: unknown) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function validUserId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validOwnedProofPath(userId: string, path: string) {
  return path.startsWith(`${userId}/`) && !path.includes("..") && !path.startsWith("/");
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
  const rows = (await response.json()) as Array<Record<string, unknown>>;
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

function isPng(bytes: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((value, index) => bytes[index] === value);
}

function isJpeg(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isWebp(bytes: Uint8Array) {
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

async function validateProof(file: File) {
  if (!file.size || file.size > PAYMENT_PROOF_MAX_BYTES) {
    throw new Error("Invalid payment proof size.");
  }
  const declared = file.type.toLowerCase() as ProofMime;
  if (!["image/png", "image/jpeg", "image/webp"].includes(declared)) {
    throw new Error("Invalid payment proof type.");
  }
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detected: ProofMime | null = isPng(bytes)
    ? "image/png"
    : isJpeg(bytes)
      ? "image/jpeg"
      : isWebp(bytes)
        ? "image/webp"
        : null;
  if (!detected || detected !== declared) throw new Error("Payment proof signature mismatch.");
  return {
    mimeType: detected,
    extension: detected === "image/png" ? "png" : detected === "image/webp" ? "webp" : "jpg",
  };
}

async function handlePaymentProofOperation(req: Request) {
  const form = await req.formData();
  const operation = String(form.get("operation") || "");
  const userId = String(form.get("userId") || "").trim();
  if (!validUserId(userId)) return json(400, { error: "Invalid proof owner." });

  if (operation === "upload_payment_proof") {
    const file = form.get("file");
    if (!(file instanceof File)) return json(400, { error: "Payment proof file required." });

    const proof = await validateProof(file);
    const path = `${userId}/${crypto.randomUUID()}.${proof.extension}`;
    const { error } = await adminClient().storage.from(PAYMENT_PROOF_BUCKET).upload(path, file, {
      contentType: proof.mimeType,
      cacheControl: "0",
      upsert: false,
    });
    if (error) throw new Error("Trusted payment proof upload failed.");
    return json(200, { path });
  }

  if (operation === "delete_payment_proof") {
    const path = String(form.get("path") || "").trim();
    if (!validOwnedProofPath(userId, path)) {
      return json(400, { error: "Invalid proof path." });
    }
    const { data: referenced, error: referenceError } = await adminClient()
      .from("manual_payment_requests_v2")
      .select("id")
      .eq("payment_proof_path", path)
      .limit(1);
    if (referenceError) throw new Error("Payment proof reference check failed.");
    if (referenced?.length) {
      return json(409, { error: "Referenced payment proof cannot be deleted." });
    }
    const { error } = await adminClient().storage.from(PAYMENT_PROOF_BUCKET).remove([path]);
    if (error) throw new Error("Trusted payment proof cleanup failed.");
    return json(200, { deleted: true });
  }

  return json(400, { error: "Invalid trusted operation." });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed." });
  if (!SUPABASE_URL) return json(500, { error: "Payment checkout unavailable." });

  try {
    await verifyVercelOidc(req);
    const contentType = req.headers.get("content-type") || "";
    if (contentType.toLowerCase().startsWith("multipart/form-data")) {
      return await handlePaymentProofOperation(req);
    }

    const body = (await req.json()) as { planKey?: string };
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
