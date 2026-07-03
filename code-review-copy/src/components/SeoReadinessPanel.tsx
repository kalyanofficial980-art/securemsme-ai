import Link from "next/link";
import {
  publicSeoPages,
  seoBlockedClaims,
  type summarizeSeoReadiness,
} from "@/lib/seo-launch-analytics-engine";

type Readiness = ReturnType<typeof summarizeSeoReadiness>;

function badgeClass(value: string) {
  if (["pass", "Launch-ready", "Info", "Low"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["warning", "Needs review", "Medium", "manual-review"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["fail", "Needs fixes", "High", "Critical"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export function SeoReadinessPanel({ readiness }: { readiness: Readiness }) {
  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <p className="text-sm font-black text-blue-700">Mega Part 74</p>
        <h2 className="mt-2 text-4xl font-black text-blue-950">
          SEO + Sitemap + Launch Analytics
        </h2>
        <p className="mt-4 max-w-4xl leading-8 text-blue-900">
          Public launch SEO foundation with no-cookie analytics and safety-first
          marketing claims.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black text-slate-500">
                  Readiness score
                </p>
                <h3 className="mt-2 text-5xl font-black">
                  {readiness.score}/100
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  {readiness.summary}
                </p>
              </div>
              <span
                className={`h-fit rounded-full px-4 py-2 text-sm font-black ${badgeClass(readiness.status)}`}
              >
                {readiness.status}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Public SEO pages</h3>
            <div className="mt-5 grid gap-3">
              {publicSeoPages.map((page) => (
                <div key={page.path} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                      {page.changeFrequency}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black">
                      priority {page.priority}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(page.indexable ? "pass" : "manual-review")}`}
                    >
                      {page.indexable ? "indexable" : "noindex"}
                    </span>
                  </div>
                  <p className="mt-3 font-black">{page.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{page.path}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {page.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">SEO checks</h3>
            <div className="mt-5 grid gap-3">
              {readiness.checks.map((check, index) => (
                <div
                  key={`${check.checkKey}-${index}`}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(check.checkStatus)}`}
                    >
                      {check.checkStatus}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(check.severity)}`}
                    >
                      {check.severity}
                    </span>
                  </div>
                  <p className="mt-3 font-black">{check.checkTitle}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {check.evidenceSummary}
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-800">
                    {check.remediationAction}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="text-xl font-black">Launch links</h3>
            <div className="mt-4 grid gap-3">
              {[
                ["/public-launch", "Landing"],
                ["/pricing", "Pricing"],
                ["/demo", "Demo"],
                ["/trust", "Trust"],
                ["/legal", "Legal"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-2xl bg-slate-50 p-4 text-sm font-black hover:bg-slate-100"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="text-xl font-black text-amber-950">
              Blocked claims
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {seoBlockedClaims.map((claim) => (
                <span
                  key={claim}
                  className="rounded-full bg-white px-3 py-2 text-xs font-bold text-amber-900"
                >
                  {claim}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="text-xl font-black">Privacy-safe analytics</h3>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
              Launch analytics stores page/source/event data only. It does not
              add cookies, fingerprinting or secret collection.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
