import { randomUUID } from "node:crypto";
import type { InbuiltAdvancedAudit } from "@/lib/inbuilt-advanced-audit";
import { applyReportAccuracyPolicy } from "@/lib/report-accuracy-policy";
import type { ScanFinding, ScanReport } from "@/lib/scanner";
import { safeFetchPublicUrl } from "@/lib/security/ssrf";
import {
  classifyResponseTruth,
  classifySensitiveExposure,
  isUncertainFindingMessage,
  type FindingTruth,
} from "@/lib/scan-truth";

type TruthAwareFinding = ScanFinding & {
  truth: FindingTruth;
  truthReason: string;
};

type ProbeResult = {
  status?: number;
  contentType?: string | null;
  body: string;
  headers: Record<string, string>;
  location?: string | null;
};

const RESPONSE_DERIVED_FINDINGS = new Set([
  "Security headers",
  "HSTS",
  "Server technology exposure",
  "Mixed content",
  "Cookie security",
]);

const EMAIL_FINDINGS = new Set([
  "MX records",
  "SPF record",
  "DMARC record",
  "DMARC policy strength",
]);

async function readBodyPrefix(response: Response, maxBytes = 65_536) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const remaining = maxBytes - total;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(chunk);
      total += chunk.byteLength;
      if (chunk.byteLength < value.byteLength) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

function headerMap(headers: Headers) {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

async function probe(url: string): Promise<ProbeResult> {
  try {
    const response = await safeFetchPublicUrl(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "text/html,text/plain,application/json,application/xml,*/*;q=0.5",
        Range: "bytes=0-65535",
        "User-Agent": "VeyraSec-Truth-Verification/2.0",
      },
    });
    return {
      status: response.status,
      contentType: response.headers.get("content-type"),
      body: await readBodyPrefix(response),
      headers: headerMap(response.headers),
      location: response.headers.get("location"),
    };
  } catch {
    return { body: "", headers: {} };
  }
}

function isLikelyOrganizationalMailHost(hostname: string) {
  const withoutWww = hostname.toLowerCase().replace(/^www\./, "");
  const parts = withoutWww.split(".").filter(Boolean);
  if (parts.length <= 2) return true;
  const commonSecondLevelSuffixes = new Set([
    "co.uk",
    "org.uk",
    "com.au",
    "net.au",
    "co.in",
    "firm.in",
    "gen.in",
    "ind.in",
    "co.jp",
    "com.br",
  ]);
  return parts.length === 3 && commonSecondLevelSuffixes.has(parts.slice(-2).join("."));
}

function defaultTruthForFinding(
  finding: ScanFinding,
  homeTruth: { truth: FindingTruth; reason: string },
  hostname: string,
): TruthAwareFinding {
  if (EMAIL_FINDINGS.has(finding.name) && !isLikelyOrganizationalMailHost(hostname)) {
    return {
      ...finding,
      status: "warning",
      message:
        "Email-domain protection was not scored for this application subdomain. Verify the organizational mail domain separately.",
      truth: "not-applicable",
      truthReason: "The scanned host appears to be an application subdomain rather than the organizational mail domain.",
    };
  }

  if (RESPONSE_DERIVED_FINDINGS.has(finding.name) && homeTruth.truth !== "verified") {
    return { ...finding, truth: "inconclusive", truthReason: homeTruth.reason };
  }

  if (isUncertainFindingMessage(finding.message)) {
    return {
      ...finding,
      truth: "inconclusive",
      truthReason: "The scanner did not obtain enough evidence to confirm this check.",
    };
  }

  if (finding.name === "Homepage reachability" && finding.status !== "pass") {
    return { ...finding, truth: "inconclusive", truthReason: homeTruth.reason };
  }

  if (finding.name === "HTTPS / SSL") {
    const verifiedTransport = homeTruth.truth === "verified" || Boolean(homeTruth.reason.includes("HTTP "));
    return {
      ...finding,
      truth: verifiedTransport ? "verified" : "inconclusive",
      truthReason: verifiedTransport
        ? "An HTTPS HTTP response was observed from the target."
        : "HTTPS transport could not be independently confirmed from the scanner vantage point.",
    };
  }

  return { ...finding, truth: "verified", truthReason: "The check has direct observed evidence." };
}

export async function applyReportTruthPolicy(
  report: ScanReport,
  inbuiltAudit: InbuiltAdvancedAudit,
) {
  const accuracy = await applyReportAccuracyPolicy(report, inbuiltAudit);
  const corrected = accuracy.report;
  const target = new URL(corrected.normalizedUrl);
  const homeProbe = await probe(corrected.normalizedUrl);
  const homeTruth = classifyResponseTruth(homeProbe);
  let findings = corrected.findings.map((finding) =>
    defaultTruthForFinding(finding, homeTruth, target.hostname),
  );

  const sensitiveRows = corrected.raw.hygiene?.sensitiveFiles || [];
  const needsContentVerification = sensitiveRows.some(
    (item) => item.status !== undefined && item.status >= 200 && item.status < 300,
  );
  const baselinePath = `/__veyrasec_probe_${randomUUID()}__`;
  const baseline = needsContentVerification
    ? await probe(new URL(baselinePath, target.origin).toString())
    : null;

  const verifiedSensitiveRows: Array<{
    path: string;
    status?: number;
    exposed: boolean;
    truth: FindingTruth;
    reason: string;
  }> = [];

  for (const row of sensitiveRows) {
    const shouldFetchContent =
      row.status !== undefined && row.status >= 200 && row.status < 300;
    const observation = shouldFetchContent
      ? await probe(new URL(row.path, target.origin).toString())
      : { status: row.status, contentType: null, body: "", headers: {} as Record<string, string> };
    const verdict = classifySensitiveExposure({
      path: row.path,
      status: observation.status,
      contentType: observation.contentType,
      body: observation.body,
      headers: observation.headers,
      baseline: baseline
        ? {
            status: baseline.status,
            contentType: baseline.contentType,
            body: baseline.body,
          }
        : null,
    });
    verifiedSensitiveRows.push({
      path: row.path,
      status: observation.status,
      exposed: verdict.exposed,
      truth: verdict.truth,
      reason: verdict.reason,
    });
  }

  const exposed = verifiedSensitiveRows.filter((row) => row.exposed && row.truth === "verified");
  const inconclusive = verifiedSensitiveRows.filter((row) => row.truth === "inconclusive");
  const sensitiveFinding: TruthAwareFinding = exposed.length
    ? {
        name: "Sensitive public files",
        status: "fail",
        message: `${exposed.length} sensitive file path(s) were confirmed by path-specific content signatures: ${exposed
          .map((row) => row.path)
          .join(", ")}.`,
        points: 0,
        maxPoints: 15,
        truth: "verified",
        truthReason:
          "Exposure requires a path-specific sensitive-content signature; HTTP 2xx alone is not accepted as evidence.",
      }
    : inconclusive.length
      ? {
          name: "Sensitive public files",
          status: "warning",
          message: `No sensitive file exposure was confirmed. ${inconclusive.length} path check(s) were inconclusive and were excluded from scoring.`,
          points: 15,
          maxPoints: 15,
          truth: "inconclusive",
          truthReason:
            "One or more candidate paths could not be verified conclusively; no exposure claim is made.",
        }
      : {
          name: "Sensitive public files",
          status: "pass",
          message: "No common sensitive public file was confirmed by the evidence checks performed.",
          points: 15,
          maxPoints: 15,
          truth: "verified",
          truthReason: "Checked sensitive paths were absent/protected or did not contain matching sensitive content.",
        };

  const sensitiveIndex = findings.findIndex((finding) => finding.name === "Sensitive public files");
  if (sensitiveIndex >= 0) findings[sensitiveIndex] = sensitiveFinding;
  else findings.push(sensitiveFinding);

  const truthSummary = {
    version: "truth-v2",
    verified: findings.filter((finding) => finding.truth === "verified").length,
    inconclusive: findings.filter((finding) => finding.truth === "inconclusive").length,
    notApplicable: findings.filter((finding) => finding.truth === "not-applicable").length,
    representativeHomepage: homeTruth.truth === "verified",
    homepageReason: homeTruth.reason,
    sensitivePathVerification: verifiedSensitiveRows.map((row) => ({
      path: row.path,
      status: row.status,
      truth: row.truth,
      exposed: row.exposed,
      reason: row.reason,
    })),
  };

  const truthReport = {
    ...corrected,
    findings,
    raw: {
      ...corrected.raw,
      hygiene: corrected.raw.hygiene
        ? {
            ...corrected.raw.hygiene,
            sensitiveFiles: verifiedSensitiveRows.map((row) => ({
              path: row.path,
              status: row.status,
              exposed: row.exposed,
            })),
          }
        : corrected.raw.hygiene,
    },
    truthSummary,
  };

  return {
    report: truthReport,
    inbuiltAdvancedAudit: accuracy.inbuiltAdvancedAudit,
  };
}
