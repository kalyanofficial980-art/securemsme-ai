import { z } from "zod";
import { classifyResponseTruth } from "@/lib/scan-truth";
import {
  hashScanAccessToken,
  isValidScanAccessHash,
  isValidScanAccessToken,
  SCAN_ACCESS_HEADER,
} from "@/lib/scan-access";
import { enforceRateLimit } from "@/lib/security/request-guard";
import { safeFetchPublicUrl } from "@/lib/security/ssrf";
import { createClient } from "@/lib/supabase/server";
import { recordTrustedScanAccessTest } from "@/lib/trusted-server-writes";

export const runtime = "nodejs";

const configureSchema = z.object({
  action: z.literal("configure"),
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  tokenPrefix: z.string().min(8).max(24),
});

const testSchema = z.object({
  action: z.literal("test"),
  token: z.string().min(1).max(120),
});

function toHeaderMap(headers: Headers) {
  const output: Record<string, string> = {};
  headers.forEach((value, key) => {
    output[key.toLowerCase()] = value;
  });
  return output;
}

async function loadOwnedWebsite(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, id: string) {
  const { data: website } = await supabase
    .from("websites")
    .select("id, url, verification_status, deep_scan_enabled, permission_attested_at, scan_access_enabled, scan_access_token_prefix, scan_access_configured_at, scan_access_last_verified_at, scan_access_last_status")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  return website;
}

async function persistTestStatus(input: {
  userId: string;
  websiteId: string;
  status: "verified" | "blocked" | "error";
}) {
  try {
    await recordTrustedScanAccessTest(input);
    return true;
  } catch {
    return false;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimited = enforceRateLimit(request, "scan-access-api", 12, 60_000);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return Response.json({ error: "Please login to configure Scan Access." }, { status: 401 });
  }

  const website = await loadOwnedWebsite(supabase, user.id, id);
  if (!website?.url) return Response.json({ error: "Website not found." }, { status: 404 });
  if (website.verification_status !== "verified" || !website.deep_scan_enabled || !website.permission_attested_at) {
    return Response.json({ error: "Verify website ownership and permission before configuring Scan Access." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const configure = configureSchema.safeParse(payload);
  if (configure.success) {
    if (!isValidScanAccessHash(configure.data.tokenHash)) {
      return Response.json({ error: "Invalid Scan Access token hash." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("configure_scan_access_v1", {
      p_website_id: website.id,
      p_token_hash: configure.data.tokenHash,
      p_token_prefix: configure.data.tokenPrefix,
    });
    if (error) {
      return Response.json({ error: error.message || "Scan Access could not be configured." }, { status: 400 });
    }

    return Response.json({ configured: true, state: Array.isArray(data) ? data[0] : data });
  }

  const test = testSchema.safeParse(payload);
  if (!test.success || !isValidScanAccessToken(test.data.token)) {
    return Response.json({ error: "Invalid Scan Access request." }, { status: 400 });
  }

  const tokenHash = hashScanAccessToken(test.data.token);
  const { data: tokenMatches, error: verifyError } = await supabase.rpc("verify_scan_access_token_v1", {
    p_website_id: website.id,
    p_token_hash: tokenHash,
  });
  if (verifyError || tokenMatches !== true) {
    return Response.json({ error: "This token does not match the configured Scan Access token. Rotate or paste the correct token." }, { status: 403 });
  }

  try {
    const response = await safeFetchPublicUrl(website.url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: {
        "User-Agent": "VeyraSec-Verified-Scan-Access/1.0",
        Accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.5",
        [SCAN_ACCESS_HEADER]: test.data.token,
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const body = /text|html|json/i.test(contentType) || contentType === ""
      ? (await response.text()).slice(0, 80_000)
      : "";
    const truth = classifyResponseTruth({
      status: response.status,
      headers: toHeaderMap(response.headers),
      body,
    });
    const verified = response.status >= 200 && response.status < 300 && truth.truth === "verified";
    const status: "verified" | "blocked" | "error" = verified
      ? "verified"
      : response.status === 403 || response.status === 429
        ? "blocked"
        : "error";
    const statusPersisted = await persistTestStatus({
      userId: user.id,
      websiteId: website.id,
      status,
    });

    return Response.json({
      verified,
      status,
      statusCode: response.status,
      statusPersisted,
      reason: verified
        ? "Representative application response received with the configured Scan Access header."
        : truth.reason,
    });
  } catch {
    const statusPersisted = await persistTestStatus({
      userId: user.id,
      websiteId: website.id,
      status: "error",
    });
    return Response.json(
      {
        verified: false,
        status: "error",
        statusCode: null,
        statusPersisted,
        reason: "The scanner could not reach a representative public response with Scan Access.",
      },
      { status: 200 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimited = enforceRateLimit(request, "scan-access-api", 12, 60_000);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return Response.json({ error: "Please login to revoke Scan Access." }, { status: 401 });
  }

  const website = await loadOwnedWebsite(supabase, user.id, id);
  if (!website?.id) return Response.json({ error: "Website not found." }, { status: 404 });

  const { error } = await supabase.rpc("revoke_scan_access_v1", { p_website_id: website.id });
  if (error) return Response.json({ error: error.message || "Scan Access could not be revoked." }, { status: 400 });

  return Response.json({ revoked: true });
}
