const fs = require('fs');
const path = require('path');

function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p,'utf8'); }
function write(p,s){ fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,s,'utf8'); console.log('WROTE',p); }
function replaceFile(p, fn){ if(!exists(p)){console.log('SKIP missing',p); return;} const a=read(p); const b=fn(a); if(a!==b){ write(p,b);} else console.log('NO CHANGE',p); }
function addImport(text, line, symbol){ if(text.includes(line)) return text; if(/^import /m.test(text)) return text.replace(/^((?:import[\s\S]*?;\r?\n)+)/, '$1'+line+'\n'); return line+'\n'+text; }
function patchBeforeFetch(file, fetchText, guardText, injectText){
  replaceFile(file, (text)=>{
    let next=text;
    if(!next.includes(guardText) && next.includes(fetchText)) next = next.replace(fetchText, injectText+'\n    '+fetchText);
    if(next!==text) next=addImport(next, 'import { validatePublicHttpUrl } from "@/lib/security/ssrf";', 'validatePublicHttpUrl');
    return next;
  });
}

write('src/lib/security/ssrf.ts', `import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp"];
const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 1_000_000;

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  const [a, b, c] = parts;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    (a >= 224 && a <= 239) || a >= 240
  );
}

function isPrivateIPv6(ip: string): boolean {
  const value = ip.toLowerCase();
  return (
    value === "::" || value === "::1" ||
    value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80") ||
    value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") ||
    value.startsWith("::ffff:192.168.") || value.startsWith("::ffff:169.254.")
  );
}

function assertPublicAddress(address: string, family: number) {
  if (family === 4 && isPrivateIPv4(address)) throw new Error("Private/internal IPv4 target is blocked");
  if (family === 6 && isPrivateIPv6(address)) throw new Error("Private/internal IPv6 target is blocked");
}

export async function validatePublicHttpUrl(input: string): Promise<URL> {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Invalid URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http and https URLs are allowed");
  if (url.username || url.password) throw new Error("URLs with username/password are not allowed");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only standard web ports 80 and 443 are allowed");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || BLOCKED_HOSTS.has(hostname) || BLOCKED_SUFFIXES.some((s) => hostname.endsWith(s))) {
    throw new Error("Local/internal hostnames are blocked");
  }
  const directIpType = net.isIP(hostname);
  if (directIpType === 4) assertPublicAddress(hostname, 4);
  if (directIpType === 6) assertPublicAddress(hostname, 6);
  const records = await dns.lookup(hostname, { all: true });
  if (!records.length) throw new Error("Target hostname did not resolve");
  for (const record of records) assertPublicAddress(record.address, record.family);
  return url;
}

export async function safeFetchPublicUrl(input: string, init?: RequestInit) {
  let current = await validatePublicHttpUrl(input);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(current.toString(), {
        ...init,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "SecureMSME-AI-Passive-Scanner/1.0",
          ...(init?.headers || {}),
        },
      });
      const location = response.headers.get("location");
      if (![301,302,303,307,308].includes(response.status) || !location) return response;
      current = await validatePublicHttpUrl(new URL(location, current).toString());
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Too many redirects while checking website");
}

export function assertSafeResponseSize(headers: Headers) {
  const rawLength = headers.get("content-length");
  if (rawLength && Number(rawLength) > MAX_RESPONSE_BYTES) {
    throw new Error("Response too large for passive scan");
  }
}
`);

write('src/lib/security/request-guard.ts', `import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rate-limit";

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function enforceRateLimit(request: Request, scope: string, limit = 20, windowMs = 60_000) {
  const key = scope + ":" + getClientIp(request);
  const result = rateLimit(key, limit, windowMs);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Too many requests. Please wait and try again." },
    { status: 429 },
  );
}
`);

// Patch scanner-like fetches with validation.
patchBeforeFetch('src/lib/ownership-verification.ts', 'const response = await fetch(url, {', 'await validatePublicHttpUrl(url);', 'await validatePublicHttpUrl(url);');
patchBeforeFetch('src/lib/inbuilt-advanced-audit.ts', 'const response = await fetch(url, {', 'await validatePublicHttpUrl(url);', 'await validatePublicHttpUrl(url);');
patchBeforeFetch('src/lib/vulnerability-intelligence.ts', 'const response = await fetch(url, {', 'await validatePublicHttpUrl(url);', 'await validatePublicHttpUrl(url);');
replaceFile('src/lib/vulnerability-intelligence.ts', t => t.replace('redirect: "follow",', 'redirect: "manual",'));
for (const f of [
  'src/lib/authorized-vulnerability-scanner.ts',
  'src/lib/advanced-crawler-engine.ts',
  'src/lib/advanced-crawler-asset-discovery-v2.ts',
  'src/lib/api-security-scanner.ts',
  'src/lib/api-security-review-v2.ts',
  'src/lib/cms-wordpress-scanner.ts',
  'src/lib/real-safe-template-worker.ts',
  'src/lib/browser-security-analyzer.ts',
  'src/lib/graphql-risk-analyzer.ts',
]) patchBeforeFetch(f, 'const response = await fetch(url.toString(), {', 'await validatePublicHttpUrl(url.toString());', 'await validatePublicHttpUrl(url.toString());');
patchBeforeFetch('src/lib/real-security-modules.ts', 'const response = await fetch(target, {', 'await validatePublicHttpUrl(target);', 'await validatePublicHttpUrl(target);');
patchBeforeFetch('src/lib/broken-access-control-engine.ts', 'const response = await fetch(input.url.toString(), {', 'await validatePublicHttpUrl(input.url.toString());', 'await validatePublicHttpUrl(input.url.toString());');
patchBeforeFetch('src/lib/authenticated-session-crawler.ts', 'const response = await fetch(input.url.toString(), {', 'await validatePublicHttpUrl(input.url.toString());', 'await validatePublicHttpUrl(input.url.toString());');

// Patch API scan route: rate-limit and early URL validation.
replaceFile('src/app/api/scan/route.ts', (text)=>{
  let next=text;
  next=addImport(next, 'import { enforceRateLimit } from "@/lib/security/request-guard";', 'enforceRateLimit');
  next=addImport(next, 'import { validatePublicHttpUrl } from "@/lib/security/ssrf";', 'validatePublicHttpUrl');
  if(!next.includes('const rateLimited = enforceRateLimit(request, "scan-api", 10, 60_000);')){
    next=next.replace('export async function POST(request: Request) {\n  try {', 'export async function POST(request: Request) {\n  const rateLimited = enforceRateLimit(request, "scan-api", 10, 60_000);\n  if (rateLimited) return rateLimited;\n\n  try {');
  }
  if(!next.includes('await validatePublicHttpUrl(websiteUrl);')){
    next=next.replace('if (!websiteUrl) {\n      return NextResponse.json(\n        { error: "Please enter a website URL or select a saved website." },\n        { status: 400 },\n      );\n    }', 'if (!websiteUrl) {\n      return NextResponse.json(\n        { error: "Please enter a website URL or select a saved website." },\n        { status: 400 },\n      );\n    }\n\n    await validatePublicHttpUrl(websiteUrl);');
  }
  return next;
});

// Patch launch analytics public POST rate-limit.
replaceFile('src/app/api/launch-analytics/route.ts', (text)=>{
  let next=text;
  next=addImport(next, 'import { enforceRateLimit } from "@/lib/security/request-guard";', 'enforceRateLimit');
  if(!next.includes('const rateLimited = enforceRateLimit(request, "launch-analytics", 60, 60_000);')){
    next=next.replace('export async function POST(request: NextRequest) {\n  try {', 'export async function POST(request: NextRequest) {\n  const rateLimited = enforceRateLimit(request, "launch-analytics", 60, 60_000);\n  if (rateLimited) return rateLimited;\n\n  try {');
  }
  return next;
});

// Hide admin operations from report navigation.
replaceFile('src/components/AdvancedReportNavigation.tsx', (text)=>{
  let next=text;
  next=next.replace(/const adminLinks: NavItem\[\] = \[[\s\S]*?\];/, 'const adminLinks: NavItem[] = [];');
  next=next.replace(/href="\/admin\/launch-ops"/g, 'href="/dashboard"');
  next=next.replace('Customer journey, security workflow and admin operations in one', 'Customer journey and security workflow in one');
  next=next.replace(/<details className="rounded-3xl border border-slate-200 bg-slate-50 p-6">[\s\S]*?<\/details>/, '{adminLinks.length ? (\n          <details className="rounded-3xl border border-slate-200 bg-slate-50 p-6">\n            <summary className="cursor-pointer font-black">Admin operations</summary>\n            <div className="mt-5 grid gap-4 md:grid-cols-3">\n              {adminLinks.map((item) => (\n                <NavCard key={item.label} item={item} scanId={scanId} />\n              ))}\n            </div>\n          </details>\n        ) : null}');
  return next;
});

// Safe RPC migration for Client Portal Pro. Existing anon table policies are too broad.
write('supabase/mega-part-77-public-client-portal-pro-safe-rpc.sql', `-- Client Portal Pro safe public token access.
-- Fixes broad anon SELECT policies by using one exact-token SECURITY DEFINER RPC.

drop policy if exists "anon read active portal pro link" on public.client_portal_pro_links_v2;
drop policy if exists "anon read active portal pro sections" on public.client_portal_pro_sections_v2;

create or replace function public.get_client_portal_pro_link(public_token text)
returns table (
  id uuid,
  target_url text,
  status text,
  executive_score integer,
  report_readiness_score integer,
  fix_progress_score integer,
  retest_pass_rate integer,
  client_readiness_score integer,
  portal_summary text,
  limitations_summary text,
  expires_at timestamptz,
  sections jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    l.id,
    l.target_url,
    l.status,
    l.executive_score,
    l.report_readiness_score,
    l.fix_progress_score,
    l.retest_pass_rate,
    l.client_readiness_score,
    l.portal_summary,
    l.limitations_summary,
    l.expires_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'title', s.title,
          'section_type', s.section_type,
          'display_order', s.display_order,
          'status_label', s.status_label,
          'body', s.body,
          'evidence_summary', s.evidence_summary,
          'action_summary', s.action_summary,
          'blocked_claim', s.blocked_claim
        ) order by s.display_order
      ) filter (where s.id is not null),
      '[]'::jsonb
    ) as sections
  from public.client_portal_pro_links_v2 l
  left join public.client_portal_pro_sections_v2 s on s.link_id = l.id
  where l.share_token = public_token
    and l.status = 'active'
    and l.expires_at > now()
  group by l.id
  limit 1;
end;
$$;

revoke all on function public.get_client_portal_pro_link(text) from public;
grant execute on function public.get_client_portal_pro_link(text) to anon, authenticated;
`);

// Patch public Client Portal Pro page to use exact-token RPC instead of broad anon table SELECT.
write('src/app/client-portal-pro/[token]/page.tsx', `import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

type PortalSection = {
  id: string;
  title: string;
  section_type: string;
  display_order: number;
  status_label: string;
  body: string;
  evidence_summary: string;
  action_summary: string;
  blocked_claim: string;
};

function badgeClass(value: string) {
  if (
    ["Ready", "active"].includes(value) ||
    value.includes("/100") ||
    value.includes("%")
  )
    return "bg-emerald-100 text-emerald-950";
  if (["Needs review", "Important"].includes(value))
    return "bg-amber-100 text-amber-950";
  return "bg-slate-100 text-slate-700";
}

export default async function ClientPortalProSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = (await createClient()) as any;
  const { data: portal, error } = await supabase
    .rpc("get_client_portal_pro_link", { public_token: token })
    .maybeSingle();

  if (error || !portal) notFound();

  const sections = ((portal.sections || []) as PortalSection[]).sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0),
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <p className="text-sm font-black text-blue-700">Client Portal Pro</p>
          <h1 className="mt-2 text-4xl font-black text-blue-950">
            Client Security Progress Portal
          </h1>
          <p className="mt-4 max-w-3xl break-all leading-8 text-blue-900">
            {portal.target_url}
          </p>
          <p className="mt-4 max-w-4xl leading-8 text-blue-900">
            {portal.portal_summary}
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            ["Executive", portal.executive_score],
            ["Report", portal.report_readiness_score],
            ["Fix", portal.fix_progress_score],
            ["Retest", portal.retest_pass_rate],
            ["Client", portal.client_readiness_score],
          ].map(([label, score]) => (
            <div
              key={String(label)}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <p className="text-sm font-black text-slate-500">{label}</p>
              <p className="mt-3 text-4xl font-black">{score}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-950"
                  style={{
                    width: Math.max(3, Math.min(100, Number(score))) + "%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-5">
          {sections.map((section) => (
            <div
              key={section.id}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">
                    {section.section_type}
                  </p>
                  <h2 className="mt-2 text-2xl font-black">{section.title}</h2>
                </div>
                <span
                  className={"rounded-full px-3 py-1 text-xs font-black " + badgeClass(section.status_label)}
                >
                  {section.status_label}
                </span>
              </div>
              <p className="mt-5 rounded-2xl bg-slate-50 p-5 leading-8 text-slate-700">
                {section.body}
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                  <p className="font-black">Evidence</p>
                  <p className="mt-2">{section.evidence_summary}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  <p className="font-black">Action</p>
                  <p className="mt-2">{section.action_summary}</p>
                </div>
                <div className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-900">
                  <p className="font-black">Blocked claim</p>
                  <p className="mt-2">{section.blocked_claim}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold leading-7 text-amber-950">
          This portal is not a legal compliance certificate and does not
          guarantee that every vulnerability was found or fixed.
          <span className="mt-2 block">
            Link expires: {new Date(portal.expires_at).toLocaleString()}
          </span>
        </div>
      </section>
    </main>
  );
}
`);

// Stronger E2E for admin deep routes and security.txt.
write('tests/e2e/security-hardening-regression.spec.ts', `import { expect, test } from "@playwright/test";

const adminRoutes = [
  "/admin/launch-ops",
  "/admin/lead-crm",
  "/admin/support-inbox",
  "/admin/abuse-protection",
  "/admin/launch-analytics",
  "/admin/demo-funnel",
];

for (const route of adminRoutes) {
  test("admin route is protected: " + route, async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const body = (await page.locator("body").innerText()).toLowerCase();
    expect(page.url().includes("/login") || body.includes("admin access required") || body.includes("please login")).toBeTruthy();
  });
}

test("public report navigation does not expose admin operation links", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const html = await page.content();
  expect(html).not.toContain('href="/admin/launch-ops"');
});
`);

console.log('SECUREMSME hardening v2 patch complete.');
