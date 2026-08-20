import type {
  ScanFinding,
  ScanReport,
} from "@/lib/scanner";
import type {
  AttackSurfaceItem,
  VulnerabilityIntelligenceReport,
} from "@/lib/vulnerability-intelligence";

const SHARED_HOSTING_SUFFIXES = [
  ".vercel.app",
  ".netlify.app",
  ".pages.dev",
  ".github.io",
  ".web.app",
  ".firebaseapp.com",
  ".onrender.com",
  ".railway.app",
];

const EMAIL_FINDINGS = new Set([
  "MX records",
  "SPF record",
  "DMARC record",
  "DMARC policy strength",
]);

const SENSITIVE_SURFACE_PATHS = new Set([
  "/.env",
  "/.git/config",
  "/config.php",
  "/backup.zip",
  "/backup.sql",
  "/db.sql",
  "/phpinfo.php",
  "/debug",
]);

function hostnameFromReport(report: ScanReport) {
  try {
    return new URL(report.normalizedUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isSharedHostingHostname(hostname: string) {
  return SHARED_HOSTING_SUFFIXES.some((suffix) => {
    const root = suffix.slice(1);
    return hostname === root || hostname.endsWith(suffix);
  });
}

function isPublic2xx(item?: AttackSurfaceItem) {
  return Boolean(
    item &&
      item.accessible &&
      item.statusCode >= 200 &&
      item.statusCode < 300,
  );
}

function surfaceMap(
  intelligence?: VulnerabilityIntelligenceReport,
) {
  return new Map(
    (intelligence?.attackSurface || []).map((item) => [
      item.path,
      item,
    ]),
  );
}

function normalizeWellKnownFinding(
  finding: ScanFinding,
  item: AttackSurfaceItem | undefined,
  label: string,
): ScanFinding {
  if (!item) return finding;

  if (item.statusCode >= 200 && item.statusCode < 300) {
    return {
      ...finding,
      status: "pass",
      message: `${label} returned HTTP ${item.statusCode}.`,
      points: finding.maxPoints,
    };
  }

  const partialPoints = Math.max(
    0,
    Math.round(finding.maxPoints * 0.5),
  );

  return {
    ...finding,
    status: "warning",
    message:
      item.statusCode === 404
        ? `${label} was not found (HTTP 404).`
        : `${label} was not publicly readable (HTTP ${item.statusCode || "unknown"}).`,
    points: partialPoints,
  };
}

export function normalizeScanReport(
  report: ScanReport,
  intelligence?: VulnerabilityIntelligenceReport,
): ScanReport {
  const hostname = hostnameFromReport(report);
  const sharedHosting = isSharedHostingHostname(hostname);
  const surfaces = surfaceMap(intelligence);

  let findings = report.findings.map((finding) => ({
    ...finding,
  }));

  // Shared hosting hostnames such as *.vercel.app are not the
  // customer's business email domain. Do not penalize MX/SPF/DMARC.
  if (sharedHosting) {
    findings = findings.filter(
      (finding) => !EMAIL_FINDINGS.has(finding.name),
    );
  }

  // A missing DMARC record is already the root-cause failure. Without a
  // record there is no policy to grade, so do not penalize the same missing
  // control again as a separate policy-strength failure.
  const dmarcRecordMissing = findings.some(
    (finding) =>
      finding.name === "DMARC record" && finding.status === "fail",
  );
  if (dmarcRecordMissing) {
    findings = findings.filter(
      (finding) => finding.name !== "DMARC policy strength",
    );
  }

  // A login page existing is not itself a vulnerability.
  // Only a publicly accessible administrative endpoint is a signal,
  // and even then it is a low-severity hardening item, not a breach.
  const adminSurfaces = [
    surfaces.get("/admin"),
    surfaces.get("/wp-admin/"),
  ].filter(Boolean) as AttackSurfaceItem[];

  const publiclyAccessibleAdmin = adminSurfaces.filter(
    isPublic2xx,
  );

  findings = findings.map((finding) => {
    if (finding.name === "Common admin/login paths") {
      if (publiclyAccessibleAdmin.length === 0) {
        return {
          ...finding,
          name: "Common admin paths",
          status: "pass",
          message:
            "No common administrative path returned a publicly accessible HTTP 2xx response.",
          points: finding.maxPoints,
        };
      }

      return {
        ...finding,
        name: "Common admin paths",
        status: "warning",
        message:
          `${publiclyAccessibleAdmin.length} common administrative path(s) returned a public HTTP 2xx response. Review authentication and rate limiting.`,
        points: Math.max(
          1,
          Math.round(finding.maxPoints * 0.6),
        ),
      };
    }

    if (finding.name === "robots.txt") {
      return normalizeWellKnownFinding(
        finding,
        surfaces.get("/robots.txt"),
        "robots.txt",
      );
    }

    if (finding.name === "sitemap.xml") {
      return normalizeWellKnownFinding(
        finding,
        surfaces.get("/sitemap.xml"),
        "sitemap.xml",
      );
    }

    if (finding.name === "security.txt") {
      return normalizeWellKnownFinding(
        finding,
        surfaces.get("/.well-known/security.txt"),
        "security.txt",
      );
    }

    return finding;
  });

  // Cross-check sensitive-path exposure against the explicit
  // attack-surface probe. 401/403/404 are not "public exposure".
  const exposedSensitive = (intelligence?.attackSurface || [])
    .filter(
      (item) =>
        SENSITIVE_SURFACE_PATHS.has(item.path) &&
        isPublic2xx(item),
    );

  findings = findings.map((finding) => {
    if (finding.name !== "Sensitive public files") {
      return finding;
    }

    if (!exposedSensitive.length) {
      return {
        ...finding,
        status: "pass",
        message:
          "No common sensitive file returned a publicly accessible HTTP 2xx response.",
        points: finding.maxPoints,
      };
    }

    return {
      ...finding,
      status: "fail",
      message:
        `${exposedSensitive.length} sensitive path(s) returned a publicly accessible HTTP 2xx response.`,
      points: 0,
    };
  });

  return {
    ...report,
    findings,
  };
}
