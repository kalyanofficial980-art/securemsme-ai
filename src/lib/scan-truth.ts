export type FindingTruth = "verified" | "inconclusive" | "not-applicable";

export type ResponseTruthInput = {
  status?: number | null;
  headers?: Record<string, string | null | undefined>;
  body?: string;
};

export type SensitiveExposureInput = ResponseTruthInput & {
  path: string;
  contentType?: string | null;
  baseline?: {
    status?: number | null;
    contentType?: string | null;
    body?: string;
  } | null;
};

const CHALLENGE_BODY_PATTERNS = [
  /verify you are human/i,
  /checking your browser/i,
  /attention required/i,
  /security challenge/i,
  /captcha/i,
  /cf-chl-/i,
  /cloudflare ray id/i,
  /request blocked/i,
  /rate limit(?:ed|ing)?/i,
  /too many requests/i,
];

const UNCERTAIN_MESSAGE_PATTERNS = [
  /could not (?:be )?(?:read|fetched|verified|confirmed|detected|completed)/i,
  /couldn't (?:be )?(?:read|fetched|verified|confirmed|detected)/i,
  /unable to (?:read|fetch|verify|confirm|detect)/i,
  /not clearly detected/i,
  /timed out/i,
  /fetch failed/i,
  /connection failed/i,
  /scanner server.*could not/i,
];

function normalizedHeaders(headers?: ResponseTruthInput["headers"]) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (value != null) result[key.toLowerCase()] = String(value);
  }
  return result;
}

export function isChallengeLikeResponse(input: ResponseTruthInput) {
  const status = input.status ?? 0;
  const headers = normalizedHeaders(input.headers);
  const body = (input.body || "").slice(0, 80_000);
  const server = headers.server?.toLowerCase() || "";

  if (status === 429 || status >= 500) return true;
  if (headers["cf-ray"] || headers["cf-mitigated"]) return true;
  if (headers["x-vercel-mitigated"] || headers["x-vercel-challenge-token"]) return true;
  if (headers["x-sucuri-id"] || headers["x-akamai-transformed"]) return true;
  if ((status === 401 || status === 403) && (server.includes("cloudflare") || body)) return true;
  return CHALLENGE_BODY_PATTERNS.some((pattern) => pattern.test(body));
}

export function classifyResponseTruth(input: ResponseTruthInput): {
  truth: FindingTruth;
  reason: string;
} {
  const status = input.status ?? 0;

  if (!status) {
    return {
      truth: "inconclusive",
      reason: "No usable HTTP response was available from the scanner vantage point.",
    };
  }

  if (isChallengeLikeResponse(input)) {
    return {
      truth: "inconclusive",
      reason: `HTTP ${status} appears to be a WAF, bot challenge, rate-limit, or upstream error response.`,
    };
  }

  if (status === 401 || status === 403 || status === 429 || status >= 500) {
    return {
      truth: "inconclusive",
      reason: `HTTP ${status} does not provide representative application evidence for scoring.`,
    };
  }

  if (status >= 400) {
    return {
      truth: "inconclusive",
      reason: `HTTP ${status} did not provide a successful representative application response.`,
    };
  }

  return { truth: "verified", reason: `Representative HTTP ${status} response observed.` };
}

export function isUncertainFindingMessage(message?: string | null) {
  const value = message || "";
  return UNCERTAIN_MESSAGE_PATTERNS.some((pattern) => pattern.test(value));
}

function normalizeBody(value: string, path?: string) {
  let normalized = value.slice(0, 24_000);
  if (path) normalized = normalized.replace(path, "{path}");
  return normalized
    .replace(/veyra(?:sec)?[-_]?probe[-_a-z0-9]*/gi, "{probe}")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function looksLikeSoft404(input: SensitiveExposureInput) {
  const baseline = input.baseline;
  if (!baseline?.status || !input.status) return false;
  if (baseline.status < 200 || baseline.status >= 300) return false;
  if (input.status < 200 || input.status >= 300) return false;

  const currentType = (input.contentType || "").toLowerCase();
  const baselineType = (baseline.contentType || "").toLowerCase();
  if (!currentType.includes("html") || !baselineType.includes("html")) return false;

  const current = normalizeBody(input.body || "", input.path);
  const reference = normalizeBody(baseline.body || "");
  if (!current || !reference) return false;
  if (current === reference) return true;

  const prefixLength = Math.min(700, current.length, reference.length);
  if (prefixLength < 120) return false;
  const samePrefix = current.slice(0, prefixLength) === reference.slice(0, prefixLength);
  const lengthRatio = Math.min(current.length, reference.length) / Math.max(current.length, reference.length);
  return samePrefix && lengthRatio >= 0.88;
}

function hasSensitiveSignature(path: string, contentType: string, body: string) {
  const lowerPath = path.toLowerCase();
  const sample = body.slice(0, 64_000);
  const lowerType = contentType.toLowerCase();

  if (lowerPath.endsWith(".zip")) {
    return sample.startsWith("PK") || lowerType.includes("zip");
  }

  if (lowerPath.includes(".git/config")) {
    return /\[core\]/i.test(sample) && /repositoryformatversion\s*=|\[remote\s+["']?origin/i.test(sample);
  }

  if (lowerPath.endsWith(".env")) {
    const assignments = sample.match(/^\s*[A-Z][A-Z0-9_]{2,64}\s*=.+$/gm) || [];
    const securityKeys = /(?:DATABASE_URL|DB_(?:HOST|USER|PASS|PASSWORD|NAME)|API_KEY|SECRET|TOKEN|PRIVATE_KEY|SUPABASE_|AWS_|STRIPE_|SMTP_)/i;
    return assignments.length >= 2 && securityKeys.test(assignments.join("\n"));
  }

  if (lowerPath.endsWith(".sql")) {
    return /(?:^|\n)\s*(?:--|CREATE\s+(?:TABLE|DATABASE)|INSERT\s+INTO|ALTER\s+TABLE|DROP\s+TABLE)\b/i.test(sample);
  }

  if (lowerPath.includes("config.php") || lowerPath.includes("wp-config")) {
    return /<\?php/i.test(sample) && /(?:DB_NAME|DB_PASSWORD|define\s*\(|\$table_prefix)/i.test(sample);
  }

  return false;
}

export function classifySensitiveExposure(input: SensitiveExposureInput): {
  truth: FindingTruth;
  exposed: boolean;
  reason: string;
} {
  const status = input.status ?? 0;
  const headers = input.headers || {};

  if (!status) {
    return { truth: "inconclusive", exposed: false, reason: "Sensitive path could not be checked." };
  }

  if (status === 401 || status === 403 || status === 404 || status === 410) {
    return { truth: "verified", exposed: false, reason: `HTTP ${status} blocks or does not expose the path.` };
  }

  if (status >= 300 && status < 400) {
    return { truth: "verified", exposed: false, reason: `HTTP ${status} redirect does not confirm sensitive content exposure.` };
  }

  if (status === 429 || status >= 500 || isChallengeLikeResponse({ status, headers, body: input.body })) {
    return { truth: "inconclusive", exposed: false, reason: `HTTP ${status} is not reliable evidence for sensitive-content exposure.` };
  }

  if (status < 200 || status >= 300) {
    return { truth: "verified", exposed: false, reason: `HTTP ${status} did not expose readable sensitive content.` };
  }

  if (looksLikeSoft404(input)) {
    return {
      truth: "verified",
      exposed: false,
      reason: "The 2xx response matches the site's catch-all/soft-404 baseline rather than sensitive file content.",
    };
  }

  const contentType = input.contentType || "";
  const body = input.body || "";
  if (hasSensitiveSignature(input.path, contentType, body)) {
    return {
      truth: "verified",
      exposed: true,
      reason: "A path-specific sensitive-content signature was confirmed without retaining the content.",
    };
  }

  return {
    truth: "inconclusive",
    exposed: false,
    reason: "The path returned 2xx, but no path-specific sensitive-content signature was confirmed.",
  };
}
