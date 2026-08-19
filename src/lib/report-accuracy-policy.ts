import type {
  InbuiltAdvancedAudit,
  InbuiltAuditEvidence,
  InbuiltAuditModule,
  InbuiltAuditStatus,
} from "@/lib/inbuilt-advanced-audit";
import type { ScanFinding, ScanReport } from "@/lib/scanner";
import { safeFetchPublicUrl } from "@/lib/security/ssrf";

const MANAGED_HOSTING_SUFFIXES = [
  ".vercel.app",
  ".netlify.app",
  ".pages.dev",
  ".github.io",
  ".web.app",
  ".firebaseapp.com",
  ".onrender.com",
  ".railway.app",
  ".fly.dev",
];

const EMAIL_FINDING_NAMES = new Set([
  "MX records",
  "SPF record",
  "DMARC record",
  "DMARC policy strength",
]);

const PRIVACY_PATHS = [
  "/legal/privacy",
  "/privacy-policy",
  "/privacy",
  "/privacy.html",
];

const TERMS_PATHS = [
  "/legal/terms",
  "/terms",
  "/terms-and-conditions",
  "/terms.html",
];

const CONTACT_PATHS = ["/contact", "/contact-us", "/contact.html"];

type ProbeResult = {
  path: string;
  url: string;
  status?: number;
  ok: boolean;
  location?: string | null;
};

type AccuracyProbeSet = {
  privacy: ProbeResult;
  terms: ProbeResult;
  contact: ProbeResult;
  robots: ProbeResult;
  sitemap: ProbeResult;
  admin: ProbeResult[];
};

function sameOriginUrl(baseUrl: string, path: string) {
  return new URL(path, new URL(baseUrl).origin).toString();
}

async function probePath(
  baseUrl: string,
  path: string,
  redirect: RequestRedirect = "follow",
): Promise<ProbeResult> {
  const url = sameOriginUrl(baseUrl, path);

  try {
    const response = await safeFetchPublicUrl(url, {
      method: "GET",
      redirect,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    return {
      path,
      url,
      status: response.status,
      ok: response.status >= 200 && response.status < 400,
      location: response.headers.get("location"),
    };
  } catch {
    return { path, url, ok: false };
  }
}

async function firstReachable(baseUrl: string, paths: string[]) {
  for (const path of paths) {
    const result = await probePath(baseUrl, path);
    if (result.ok) return result;
  }

  return probePath(baseUrl, paths[0]);
}

async function collectAccuracyProbes(baseUrl: string): Promise<AccuracyProbeSet> {
  const [privacy, terms, contact, robots, sitemap, ...admin] = await Promise.all([
    firstReachable(baseUrl, PRIVACY_PATHS),
    firstReachable(baseUrl, TERMS_PATHS),
    firstReachable(baseUrl, CONTACT_PATHS),
    probePath(baseUrl, "/robots.txt"),
    probePath(baseUrl, "/sitemap.xml"),
    probePath(baseUrl, "/admin", "manual"),
    probePath(baseUrl, "/wp-admin", "manual"),
    probePath(baseUrl, "/wp-admin/", "manual"),
  ]);

  return { privacy, terms, contact, robots, sitemap, admin };
}

function isManagedHostingHostname(hostname: string) {
  const lower = hostname.toLowerCase();
  return MANAGED_HOSTING_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

function replaceFinding(
  findings: ScanFinding[],
  name: string,
  replacement: ScanFinding,
) {
  const index = findings.findIndex((finding) => finding.name === name);

  if (index >= 0) {
    findings[index] = replacement;
  } else {
    findings.push(replacement);
  }
}

function legalFinding(
  name: "Privacy policy" | "Terms page" | "Contact page",
  probe: ProbeResult,
  maxPoints: number,
): ScanFinding {
  if (probe.ok) {
    return {
      name,
      status: "pass",
      message: `${name} was verified at ${probe.path}.`,
      points: maxPoints,
      maxPoints,
    };
  }

  return {
    name,
    status: name === "Privacy policy" ? "fail" : "warning",
    message: `${name} could not be verified on the checked public routes.`,
    points: 0,
    maxPoints,
  };
}

function publicAssetFinding(
  name: "robots.txt" | "sitemap.xml",
  probe: ProbeResult,
): ScanFinding {
  const maxPoints = 5;
  return {
    name,
    status: probe.ok ? "pass" : "warning",
    message: probe.ok
      ? `${name} was verified with HTTP ${probe.status}.`
      : `${name} could not be verified${probe.status ? ` (HTTP ${probe.status})` : ""}.`,
    points: probe.ok ? maxPoints : 2,
    maxPoints,
  };
}

function adminSurfaceFinding(probes: ProbeResult[]): ScanFinding {
  const exposed = probes.filter(
    (probe) => probe.status !== undefined && probe.status >= 200 && probe.status < 300,
  );
  const protectedOrAbsent = probes.filter(
    (probe) =>
      probe.status === 401 ||
      probe.status === 403 ||
      probe.status === 404 ||
      (probe.status !== undefined && probe.status >= 300 && probe.status < 400),
  );

  if (exposed.length === 0) {
    return {
      name: "Common admin/login paths",
      status: "pass",
      message:
        protectedOrAbsent.length > 0
          ? "Checked administrative paths were blocked, redirected, or absent. A public login page is expected and is not treated as a vulnerability by itself."
          : "No unauthenticated administrative page was confirmed by the safe public probe.",
      points: 15,
      maxPoints: 15,
    };
  }

  return {
    name: "Common admin/login paths",
    status: "warning",
    message: `${exposed.map((probe) => probe.path).join(", ")} returned HTTP 2xx. Reachability alone does not prove unauthorized access; verify authentication and authorization controls.`,
    points: 8,
    maxPoints: 15,
  };
}

function severityPenalty(item: InbuiltAuditEvidence) {
  if (item.status === "pass" || item.status === "info") return 0;

  const base =
    item.severity === "Critical"
      ? 22
      : item.severity === "High"
        ? 15
        : item.severity === "Medium"
          ? 9
          : 4;

  return item.status === "warning" ? Math.ceil(base * 0.65) : base;
}

function moduleStatus(items: InbuiltAuditEvidence[]): InbuiltAuditStatus {
  if (items.some((item) => item.status === "fail")) return "fail";
  if (items.some((item) => item.status === "warning")) return "warning";
  return "pass";
}

function rebuildModules(evidence: InbuiltAuditEvidence[]): InbuiltAuditModule[] {
  const names = Array.from(new Set(evidence.map((item) => item.module)));

  return names.map((name, index) => {
    const items = evidence.filter((item) => item.module === name);
    const score = Math.max(
      0,
      100 - items.reduce((total, item) => total + severityPenalty(item), 0),
    );
    const status = moduleStatus(items);

    return {
      id: `MOD-${String(index + 1).padStart(2, "0")}`,
      name,
      score,
      status,
      evidenceCount: items.length,
      summary:
        status === "fail"
          ? `${name} has a failed passive check that requires review.`
          : status === "warning"
            ? `${name} has one or more passive warnings that should be reviewed.`
            : `${name} passed the checks performed in this passive scope.`,
    };
  });
}

function updateEvidence(
  evidence: InbuiltAuditEvidence[],
  predicate: (item: InbuiltAuditEvidence) => boolean,
  update: (item: InbuiltAuditEvidence) => InbuiltAuditEvidence,
) {
  return evidence.map((item) => (predicate(item) ? update(item) : item));
}

function alignInbuiltAudit(
  audit: InbuiltAdvancedAudit,
  probes: AccuracyProbeSet,
): InbuiltAdvancedAudit {
  let evidence = audit.evidence.map((item) => ({ ...item }));

  evidence = updateEvidence(
    evidence,
    (item) => item.title.toLowerCase().includes("robots.txt"),
    (item) => ({
      ...item,
      title: probes.robots.ok ? "robots.txt present" : "robots.txt not verified",
      url: probes.robots.url,
      status: probes.robots.ok ? "pass" : "warning",
      severity: probes.robots.ok ? "Info" : "Low",
      evidence: probes.robots.ok
        ? `robots.txt returned HTTP ${probes.robots.status}.`
        : `robots.txt could not be verified${probes.robots.status ? ` (HTTP ${probes.robots.status})` : ""}.`,
      customerImpact: probes.robots.ok
        ? "Crawler guidance is publicly available."
        : "Crawler guidance could not be confirmed by this passive probe.",
      fix: probes.robots.ok
        ? "Keep robots.txt current and do not use it as an access-control mechanism."
        : "Verify robots.txt from the public internet and add it if it is genuinely missing.",
    }),
  );

  evidence = updateEvidence(
    evidence,
    (item) => item.title.toLowerCase().includes("sitemap.xml"),
    (item) => ({
      ...item,
      title: probes.sitemap.ok ? "sitemap.xml present" : "sitemap.xml not verified",
      url: probes.sitemap.url,
      status: probes.sitemap.ok ? "pass" : "warning",
      severity: probes.sitemap.ok ? "Info" : "Low",
      evidence: probes.sitemap.ok
        ? `sitemap.xml returned HTTP ${probes.sitemap.status}.`
        : `sitemap.xml could not be verified${probes.sitemap.status ? ` (HTTP ${probes.sitemap.status})` : ""}.`,
      customerImpact: probes.sitemap.ok
        ? "Public page discovery can use the sitemap."
        : "Public page discovery could not be confirmed by this passive probe.",
      fix: probes.sitemap.ok
        ? "Keep the sitemap current and exclude private routes."
        : "Verify sitemap.xml from the public internet and add it if it is genuinely missing.",
    }),
  );

  evidence = updateEvidence(
    evidence,
    (item) => item.title.toLowerCase().includes("privacy"),
    (item) => ({
      ...item,
      title: probes.privacy.ok ? "Privacy policy present" : "Privacy policy not verified",
      url: probes.privacy.url,
      status: probes.privacy.ok ? "pass" : "warning",
      severity: probes.privacy.ok ? "Info" : "Medium",
      evidence: probes.privacy.ok
        ? `Privacy policy returned HTTP ${probes.privacy.status} at ${probes.privacy.path}.`
        : "No dedicated privacy policy page was verified on the checked public routes.",
      customerImpact: probes.privacy.ok
        ? "Customers have a dedicated place to review data-handling terms."
        : "A homepage mention alone is not enough to verify a privacy policy.",
      fix: probes.privacy.ok
        ? "Keep the privacy policy accurate and current."
        : "Publish a dedicated privacy policy and link it from the public website.",
    }),
  );

  evidence = updateEvidence(
    evidence,
    (item) => item.title.toLowerCase().includes("terms"),
    (item) => ({
      ...item,
      title: probes.terms.ok ? "Terms page present" : "Terms page not verified",
      url: probes.terms.url,
      status: probes.terms.ok ? "pass" : "warning",
      severity: probes.terms.ok ? "Info" : "Low",
      evidence: probes.terms.ok
        ? `Terms page returned HTTP ${probes.terms.status} at ${probes.terms.path}.`
        : "No dedicated terms page was verified on the checked public routes.",
      customerImpact: probes.terms.ok
        ? "Customers can review service terms on a dedicated page."
        : "A homepage mention alone is not enough to verify service terms.",
      fix: probes.terms.ok
        ? "Keep service terms accurate and current."
        : "Publish a dedicated terms page and link it from the public website.",
    }),
  );

  evidence = updateEvidence(
    evidence,
    (item) => item.title.toLowerCase().includes("contact"),
    (item) => ({
      ...item,
      title: probes.contact.ok ? "Contact page present" : "Contact page not verified",
      url: probes.contact.url,
      status: probes.contact.ok ? "pass" : "warning",
      severity: probes.contact.ok ? "Info" : "Low",
      evidence: probes.contact.ok
        ? `Contact page returned HTTP ${probes.contact.status} at ${probes.contact.path}.`
        : "No dedicated contact page was verified on the checked public routes.",
      customerImpact: probes.contact.ok
        ? "Customers have a dedicated communication path."
        : "A homepage mention alone is not enough to verify a contact path.",
      fix: probes.contact.ok
        ? "Keep contact details accurate and monitored."
        : "Publish a dedicated contact page or support route.",
    }),
  );

  const modules = rebuildModules(evidence);
  const overallScore = Math.round(
    modules.reduce((total, module) => total + module.score, 0) /
      Math.max(1, modules.length),
  );
  const failed = evidence.filter((item) => item.status === "fail").length;
  const warnings = evidence.filter((item) => item.status === "warning").length;
  const priorityFixes = evidence
    .filter((item) => item.status === "fail" || item.status === "warning")
    .slice(0, 7)
    .map((item) => `${item.title}: ${item.fix}`);

  return {
    ...audit,
    overallScore,
    modules,
    businessReadiness:
      failed > 0
        ? "Needs improvement"
        : warnings > 0
          ? "Trust ready"
          : overallScore >= 92
            ? "Premium ready"
            : audit.businessReadiness,
    customerSummary:
      failed > 0
        ? `Passive checks found ${failed} failed check(s) and ${warnings} warning(s). Review the evidence before making customer security claims.`
        : warnings > 0
          ? `Passive checks found no failed checks and ${warnings} warning(s). The baseline is useful, but the warnings still require review and this is not a security certification.`
          : "No failed or warning signals were found in this passive scope. This is not a penetration test, compliance audit, or security certification.",
    priorityFixes: priorityFixes.length
      ? priorityFixes
      : ["Maintain the current passive posture and continue scheduled monitoring."],
    safeTestingNotice: Array.from(
      new Set([
        ...audit.safeTestingNotice,
        "OWASP/ASVS references are educational control mappings only, not certification.",
      ]),
    ),
  };
}

export async function applyReportAccuracyPolicy(
  report: ScanReport,
  inbuiltAudit: InbuiltAdvancedAudit,
) {
  const probes = await collectAccuracyProbes(report.normalizedUrl);
  let findings = report.findings.map((finding) => ({ ...finding }));
  const hostname = new URL(report.normalizedUrl).hostname;

  if (isManagedHostingHostname(hostname)) {
    findings = findings.filter((finding) => !EMAIL_FINDING_NAMES.has(finding.name));
  }

  replaceFinding(
    findings,
    "Privacy policy",
    legalFinding("Privacy policy", probes.privacy, 10),
  );
  replaceFinding(findings, "Terms page", legalFinding("Terms page", probes.terms, 5));
  replaceFinding(
    findings,
    "Contact page",
    legalFinding("Contact page", probes.contact, 5),
  );
  replaceFinding(findings, "robots.txt", publicAssetFinding("robots.txt", probes.robots));
  replaceFinding(
    findings,
    "sitemap.xml",
    publicAssetFinding("sitemap.xml", probes.sitemap),
  );
  replaceFinding(findings, "Common admin/login paths", adminSurfaceFinding(probes.admin));

  const correctedReport: ScanReport = {
    ...report,
    findings,
    raw: {
      ...report.raw,
      hygiene: report.raw.hygiene
        ? {
            ...report.raw.hygiene,
            robotsTxt: probes.robots.ok,
            sitemapXml: probes.sitemap.ok,
          }
        : report.raw.hygiene,
    },
  };

  return {
    report: correctedReport,
    inbuiltAdvancedAudit: alignInbuiltAudit(inbuiltAudit, probes),
  };
}
