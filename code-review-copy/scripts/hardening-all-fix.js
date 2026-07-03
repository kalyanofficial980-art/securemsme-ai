const fs = require("fs");
const path = require("path");

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  fs.writeFileSync(file, text, "utf8");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function log(msg) {
  console.log(msg);
}

function addImport(text, importLine, symbol) {
  if (text.includes(symbol)) return text;

  if (/^import /m.test(text)) {
    return text.replace(/^((?:import[\s\S]*?;\r?\n)+)/, "$1" + importLine + "\n");
  }

  return importLine + "\n" + text;
}

function patchOnce(text, from, to, guard) {
  if (guard && text.includes(guard)) return text;
  if (!text.includes(from)) return text;
  return text.replace(from, to);
}

function patchFetchFile(file, patches) {
  if (!exists(file)) {
    log("SKIP missing: " + file);
    return;
  }

  let text = read(file);
  let next = text;

  for (const p of patches) {
    next = patchOnce(next, p.from, p.to, p.guard);
  }

  if (next !== text) {
    next = addImport(
      next,
      'import { validatePublicHttpUrl } from "@/lib/security/ssrf";',
      "validatePublicHttpUrl"
    );
    write(file, next);
    log("PATCHED SSRF: " + file);
  } else {
    log("NO SSRF CHANGE: " + file);
  }
}

function writeFile(file, content) {
  ensureDir(path.dirname(file));
  write(file, content);
  log("WROTE: " + file);
}

// 4) Strong SSRF helper
writeFile("src/lib/security/ssrf.ts", `import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
]);

const BLOCKED_IPV4_RANGES = [
  /^127\\./,
  /^10\\./,
  /^0\\./,
  /^169\\.254\\./,
  /^192\\.168\\./,
  /^172\\.(1[6-9]|2[0-9]|3[0-1])\\./,
];

function isPrivateIPv4(ip: string): boolean {
  return BLOCKED_IPV4_RANGES.some((r) => r.test(ip));
}

function isPrivateIPv6(ip: string): boolean {
  const value = ip.toLowerCase();
  return (
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe80:") ||
    value.includes("::ffff:127.") ||
    value.includes("::ffff:10.") ||
    value.includes("::ffff:192.168.")
  );
}

function assertPublicIp(address: string, family: number) {
  if (family === 4 && isPrivateIPv4(address)) {
    throw new Error("Private IPv4 targets are blocked");
  }

  if (family === 6 && isPrivateIPv6(address)) {
    throw new Error("Private IPv6 targets are blocked");
  }
}

export async function validatePublicHttpUrl(input: string): Promise<URL> {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are allowed");
  }

  if (url.username || url.password) {
    throw new Error("URLs with username/password are not allowed");
  }

  const hostname = url.hostname.toLowerCase();

  if (!hostname || BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("Local/internal hostnames are blocked");
  }

  const directIpType = net.isIP(hostname);

  if (directIpType === 4) assertPublicIp(hostname, 4);
  if (directIpType === 6) assertPublicIp(hostname, 6);

  const records = await dns.lookup(hostname, { all: true });

  if (!records.length) {
    throw new Error("Target hostname did not resolve");
  }

  for (const record of records) {
    assertPublicIp(record.address, record.family);
  }

  return url;
}

export async function safeFetchPublicUrl(input: string, init?: RequestInit) {
  const url = await validatePublicHttpUrl(input);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    return await fetch(url.toString(), {
      ...init,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "SecureMSME-AI-Passive-Scanner/1.0",
        ...(init?.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}
`);

// 5) Safe wording helper
writeFile("src/lib/security/wording.ts", `export function safeSecurityText(text: string): string {
  return text
    .replace(/\\bFAIL\\b/g, "Needs review")
    .replace(/\\bFailed\\b/g, "Needs review")
    .replace(/\\bfailed\\b/g, "needs review")
    .replace(/\\bConfirmed evidence\\b/g, "Observed evidence")
    .replace(/\\bconfirmed evidence\\b/g, "observed evidence")
    .replace(/\\bVulnerability found\\b/g, "Potential issue")
    .replace(/\\bvulnerability found\\b/g, "potential issue")
    .replace(/\\bOWASP\\/ASVS audit\\b/g, "OWASP/ASVS-style readiness mapping")
    .replace(/\\bSecurity maturity audit\\b/g, "Security readiness review");
}

export const safeLabels = {
  fail: "Needs review",
  confirmedEvidence: "Observed evidence",
  vulnerability: "Potential issue",
  audit: "OWASP/ASVS-style readiness mapping",
  maturity: "Security readiness score",
  notMeasured: "Not measured yet",
};
`);

// 6) Rate limit helper
writeFile("src/lib/security/rate-limit.ts", `type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;

  return { allowed: true, remaining: limit - bucket.count };
}
`);

// 7) Report safety helper
writeFile("src/lib/security/report-safety.ts", `const SENSITIVE_PATHS = [
  "/admin",
  "/login",
  "/wp-admin",
  "/api",
  "/graphql",
  "/debug",
  "/.env",
  "/backup.zip",
  "/config.php",
];

export function maskSensitivePath(path: string) {
  if (!path) return path;

  if (SENSITIVE_PATHS.some((p) => path.toLowerCase().startsWith(p))) {
    return "/[hidden in client-safe report]";
  }

  return path;
}

export function formatEmptyMetric(value: number | null | undefined, hasRun: boolean) {
  if (!hasRun) return "Not measured yet";
  if (value === null || value === undefined) return "Not measured yet";
  return String(value);
}

export function clientSafeFinding(finding: any) {
  return {
    ...finding,
    path: finding?.path ? maskSensitivePath(finding.path) : finding?.path,
    surface: finding?.surface ? maskSensitivePath(finding.surface) : finding?.surface,
    evidence: Array.isArray(finding?.evidence)
      ? finding.evidence.map((item: string) => maskSensitivePath(item))
      : finding?.evidence,
  };
}
`);

// 8) AI guardrails
writeFile("src/lib/security/ai-guardrails.ts", `export const AI_COPILOT_SYSTEM_RULES = \`
You are SecureMSME AI Copilot.

Rules:
1. Answer only from the current report evidence.
2. Cite finding IDs when explaining issues.
3. Do not claim a breach, exploit, or confirmed CVE unless the report evidence proves it.
4. Do not provide exploit payloads.
5. Do not help bypass login, authentication, authorization, rate limits, or access controls.
6. Do not ask for passwords, OTPs, cookies, private keys, Supabase service role keys, or secret tokens.
7. Explain in simple business language first.
8. Then provide safe developer remediation steps.
9. Keep all testing passive unless ownership verification is confirmed.
10. If evidence is missing, say "This is not proven by the current report."
\`;

export function buildCopilotPrompt(reportEvidence: string, userQuestion: string) {
  return \`
\${AI_COPILOT_SYSTEM_RULES}

Current report evidence:
\${reportEvidence}

User question:
\${userQuestion}
\`;
}
`);

// 9) security.txt route
writeFile("src/app/.well-known/security.txt/route.ts", `export async function GET() {
  const body = \`Contact: mailto:kalyanofficial980@gmail.com
Preferred-Languages: en, te, hi
Policy: https://securemsme-ai-live.vercel.app/legal/responsible-disclosure
\`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
`);

// 10) Next proxy security headers
writeFile("src/proxy.ts", `import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://*.vercel.app; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
};

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
`);

// 11) SSRF patch selected scanner files only
const stringUrlPatch = [
  {
    from: "const response = await fetch(url, {",
    guard: "await validatePublicHttpUrl(url);",
    to: "await validatePublicHttpUrl(url);\n    const response = await fetch(url, {"
  }
];

const urlObjectPatch = [
  {
    from: "const response = await fetch(url.toString(), {",
    guard: "await validatePublicHttpUrl(url.toString());",
    to: "await validatePublicHttpUrl(url.toString());\n    const response = await fetch(url.toString(), {"
  }
];

patchFetchFile("src/lib/scanner.ts", [
  {
    from: "return await fetch(url, {",
    guard: "await validatePublicHttpUrl(typeof url ===",
    to: 'await validatePublicHttpUrl(typeof url === "string" ? url : url.toString());\n    return await fetch(url, {'
  }
]);

patchFetchFile("src/lib/ownership-verification.ts", stringUrlPatch);
patchFetchFile("src/lib/inbuilt-advanced-audit.ts", stringUrlPatch);
patchFetchFile("src/lib/authorized-vulnerability-scanner.ts", urlObjectPatch);
patchFetchFile("src/lib/advanced-crawler-engine.ts", urlObjectPatch);
patchFetchFile("src/lib/advanced-crawler-asset-discovery-v2.ts", urlObjectPatch);
patchFetchFile("src/lib/api-security-scanner.ts", urlObjectPatch);
patchFetchFile("src/lib/api-security-review-v2.ts", urlObjectPatch);
patchFetchFile("src/lib/cms-wordpress-scanner.ts", urlObjectPatch);
patchFetchFile("src/lib/real-safe-template-worker.ts", urlObjectPatch);
patchFetchFile("src/lib/browser-security-analyzer.ts", urlObjectPatch);
patchFetchFile("src/lib/graphql-risk-analyzer.ts", urlObjectPatch);

patchFetchFile("src/lib/real-security-modules.ts", [
  {
    from: "const response = await fetch(target, {",
    guard: "await validatePublicHttpUrl(target);",
    to: "await validatePublicHttpUrl(target);\n    const response = await fetch(target, {"
  }
]);

patchFetchFile("src/lib/broken-access-control-engine.ts", [
  {
    from: "const response = await fetch(input.url.toString(), {",
    guard: "await validatePublicHttpUrl(input.url.toString());",
    to: "await validatePublicHttpUrl(input.url.toString());\n    const response = await fetch(input.url.toString(), {"
  }
]);

patchFetchFile("src/lib/authenticated-session-crawler.ts", [
  {
    from: "const response = await fetch(input.url.toString(), {",
    guard: "await validatePublicHttpUrl(input.url.toString());",
    to: "await validatePublicHttpUrl(input.url.toString());\n    const response = await fetch(input.url.toString(), {"
  }
]);

// 12) Hide public admin operation links
const navFile = "src/components/AdvancedReportNavigation.tsx";
if (exists(navFile)) {
  let text = read(navFile);
  let next = text;

  next = next.replace(/const adminLinks: NavItem\\[\\] = \\[[\\s\\S]*?\\];/, "const adminLinks: NavItem[] = [];");
  next = next.replace(/href="\\/admin\\/[^"]+"/g, 'href="/dashboard"');

  if (next !== text) {
    write(navFile, next);
    log("PATCHED ADMIN NAV: " + navFile);
  } else {
    log("NO ADMIN NAV CHANGE: " + navFile);
  }
}

// 13) Remove wrong middleware if exists
if (exists("src/middleware.ts")) {
  fs.rmSync("src/middleware.ts", { force: true });
  log("REMOVED wrong src/middleware.ts");
}

// 14) Audit remaining issues
const auditFiles = [];
function walk(dir) {
  if (!exists(dir)) return;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      if (!["node_modules", ".next", ".git"].includes(item)) walk(full);
    } else if (/\\.(ts|tsx|js|jsx)$/.test(full)) {
      auditFiles.push(full);
    }
  }
}

walk("src");

const problems = [];
for (const file of auditFiles) {
  const text = read(file);

  if (/href="\\/admin\\//.test(text)) {
    problems.push(`${file}: still has public-looking /admin href`);
  }

  if (/\\bFAIL\\b|Confirmed evidence|Vulnerability found|Security maturity audit|OWASP\\/ASVS audit/.test(text)) {
    problems.push(`${file}: has risky wording; review UI-only wording`);
  }

  if (/fetch\\(/.test(text) && /scanner|crawler|audit|verification|vulnerability|wordpress|graphql|access-control|security/.test(file.replace(/\\\\/g, "/"))) {
    if (!text.includes("validatePublicHttpUrl")) {
      problems.push(`${file}: scanner-like fetch without validatePublicHttpUrl`);
    }
  }
}

const report = [
  "# SecureMSME AI hardening report",
  "",
  "Generated by scripts/hardening-all-fix.js",
  "",
  "## Remaining review items",
  "",
  problems.length ? problems.map((p) => `- ${p}`).join("\\n") : "- No major automated review items found.",
  "",
].join("\\n");

write("hardening-report.md", report);
log("WROTE: hardening-report.md");
log("DONE full hardening script.");
