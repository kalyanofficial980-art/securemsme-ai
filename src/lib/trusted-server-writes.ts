import { headers } from "next/headers";

const TRUSTED_WRITE_FUNCTION = "veyra-trusted-write-v1";
const SCAN_ACCESS_STATUS_FUNCTION = "veyra-scan-access-status-v1";

type TrustedScanRecord = {
  id: string;
  website_id: string | null;
  website_url: string;
  score: number;
  risk_level: string;
  report: unknown;
  created_at: string;
};

type PersistTrustedScanInput = {
  userId: string;
  websiteId: string | null;
  websiteUrl: string;
  score: number;
  riskLevel: string;
  report: unknown;
};

type VerificationPatch = {
  verification_token?: string | null;
  verification_method?: "dns_txt" | "html_file" | "meta_tag";
  verification_status?: "unverified" | "pending" | "verified" | "failed";
  verified_at?: string | null;
  verified_by?: string | null;
  permission_attested_at?: string | null;
  deep_scan_enabled?: boolean;
};

async function getVercelOidcToken() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN || null;
}

async function trustedFunction<T>(functionName: string, payload: Record<string, unknown>): Promise<T> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oidcToken = await getVercelOidcToken();

  if (!supabaseUrl || !oidcToken) {
    throw new Error("Trusted server write is unavailable.");
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/${functionName}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${oidcToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Trusted server write failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function trustedWrite<T>(payload: Record<string, unknown>): Promise<T> {
  return trustedFunction<T>(TRUSTED_WRITE_FUNCTION, payload);
}

export async function persistTrustedScan(
  input: PersistTrustedScanInput,
): Promise<TrustedScanRecord> {
  const result = await trustedWrite<{ scan: TrustedScanRecord }>({
    operation: "persist_scan",
    user_id: input.userId,
    website_id: input.websiteId,
    website_url: input.websiteUrl,
    score: input.score,
    risk_level: input.riskLevel,
    report: input.report,
  });

  if (!result.scan?.id) {
    throw new Error("Trusted scan persistence returned no scan.");
  }

  return result.scan;
}

export async function updateTrustedWebsiteVerification(input: {
  userId: string;
  websiteId: string;
  patch: VerificationPatch;
}) {
  await trustedWrite<{ ok: true }>({
    operation: "update_website_verification",
    user_id: input.userId,
    website_id: input.websiteId,
    patch: input.patch,
  });
}

export async function recordTrustedScanAccessTest(input: {
  userId: string;
  websiteId: string;
  status: "verified" | "blocked" | "error";
}) {
  await trustedFunction<{ ok: true }>(SCAN_ACCESS_STATUS_FUNCTION, {
    user_id: input.userId,
    website_id: input.websiteId,
    status: input.status,
  });
}
