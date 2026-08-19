import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";

const workflow = [
  ["01", "Scan", "Run safe public checks and collect reproducible evidence."],
  ["02", "Review", "Prioritize findings by severity, confidence and business relevance."],
  ["03", "Remediate", "Give developers concrete fixes instead of generic security advice."],
  ["04", "Retest", "Compare the new result with the baseline and document what changed."],
] as const;

const findings = [
  ["Privacy policy missing", "Medium", "Open"],
  ["Content-Security-Policy", "Low", "Review"],
  ["Referrer policy", "Low", "Review"],
] as const;

const deliverables = [
  ["Prioritized findings", "Focus on actionable issues instead of raw scanner noise."],
  ["Developer-ready fixes", "Give implementation guidance that can move directly into remediation work."],
  ["Retest comparison", "Show resolved, persistent and new findings after changes are deployed."],
  ["Client-ready evidence", "Keep score, findings, ownership state and report history attached to each website."],
] as const;

type HomeProps = {
  searchParams?: Promise<{
    code?: string;
    error?: string;
    error_description?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  if (params?.code) {
    const callback = new URLSearchParams({ code: params.code, next: "/dashboard" });
    redirect(`/auth/callback?${callback.toString()}`);
  }

  if (params?.error || params?.error_description) {
    const message = encodeURIComponent("Google sign-in was not completed. Please try again.");
    redirect(`/login?message=${message}`);
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Website security operations</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl lg:text-[58px]">
              Security reviews that end with a clear fix list.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              VeyraSec helps agencies and small teams scan public websites, verify ownership for deeper review, prioritize findings, and prove remediation with retest evidence.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex items-center justify-center rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">Start a security review</Link>
              <Link href="/pricing" className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50">View pricing</Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 border-t border-slate-200 pt-6 text-sm text-slate-600">
              <span><strong className="font-semibold text-slate-900">Safe</strong> public checks</span>
              <span><strong className="font-semibold text-slate-900">Verified</strong> ownership controls</span>
              <span><strong className="font-semibold text-slate-900">Client-ready</strong> reports</span>
            </div>
          </div>

          <div className="border border-slate-300 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Security review</p>
                <p className="mt-0.5 text-xs text-slate-500">Example customer-facing output</p>
              </div>
              <span className="text-xs font-medium text-slate-500">example.com</span>
            </div>
            <div className="grid border-b border-slate-200 sm:grid-cols-[180px_1fr]">
              <div className="border-b border-slate-200 p-6 sm:border-b-0 sm:border-r">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Overall score</p>
                <div className="mt-4 flex items-end gap-2"><span className="text-5xl font-semibold tracking-[-0.05em]">82</span><span className="pb-1 text-sm text-slate-500">/100</span></div>
                <p className="mt-2 text-sm font-semibold text-amber-700">Medium risk</p>
              </div>
              <div className="grid grid-cols-2">
                {[["Website security", "93"], ["Exposure risk", "100"], ["Website hygiene", "55"], ["Trust & privacy", "25"]].map(([label, score], index) => (
                  <div key={label} className={`p-5 ${index < 2 ? "border-b border-slate-200" : ""} ${index % 2 === 0 ? "border-r border-slate-200" : ""}`}>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950">{score}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5">
              <div className="mb-3 grid grid-cols-[1fr_90px_80px] gap-4 border-b border-slate-200 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"><span>Finding</span><span>Severity</span><span>Status</span></div>
              <div className="divide-y divide-slate-100">
                {findings.map(([finding, severity, status]) => (
                  <div key={finding} className="grid grid-cols-[1fr_90px_80px] gap-4 py-3 text-sm"><span className="font-medium text-slate-800">{finding}</span><span className="text-slate-600">{severity}</span><span className="text-slate-600">{status}</span></div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500"><span>Evidence captured · remediation available</span><span className="font-semibold text-blue-700">Open report →</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-18">
        <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">One path from scan to evidence.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">Keep the customer journey simple while the security logic stays strict underneath.</p>
          </div>
          <div className="border-t border-slate-300">
            {workflow.map(([step, title, body]) => (
              <div key={step} className="grid gap-3 border-b border-slate-200 py-6 sm:grid-cols-[70px_150px_1fr] sm:items-start"><span className="text-xs font-semibold tracking-[0.12em] text-slate-400">{step}</span><h3 className="text-base font-semibold text-slate-950">{title}</h3><p className="max-w-2xl text-sm leading-6 text-slate-600">{body}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Public checks</p><h3 className="mt-3 text-lg font-semibold text-slate-950">Low-friction first review</h3><p className="mt-3 text-sm leading-6 text-slate-600">Evaluate public security signals without destructive testing or credential use.</p></div>
          <div className="lg:border-l lg:border-slate-200 lg:pl-10"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ownership gate</p><h3 className="mt-3 text-lg font-semibold text-slate-950">Deeper review only with permission</h3><p className="mt-3 text-sm leading-6 text-slate-600">Verified ownership or explicit authorization is required before deeper passive workflows are unlocked.</p></div>
          <div className="lg:border-l lg:border-slate-200 lg:pl-10"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Retest evidence</p><h3 className="mt-3 text-lg font-semibold text-slate-950">Show what improved</h3><p className="mt-3 text-sm leading-6 text-slate-600">Compare baseline and retest results so teams can document resolved, persistent and new findings.</p></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-18">
        <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Deliverables</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Useful output after every review.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">The result should help a developer fix the site and help a client understand what changed.</p>
          </div>
          <div className="grid border-t border-slate-300 sm:grid-cols-2">
            {deliverables.map(([title, body], index) => (
              <div key={title} className={`py-6 sm:p-6 ${index % 2 === 0 ? "sm:border-r sm:border-slate-200" : ""} ${index < 2 ? "border-b border-slate-200" : ""}`}><h3 className="text-base font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="flex flex-col justify-between gap-6 border-l-2 border-blue-700 pl-6 md:flex-row md:items-center">
            <div><p className="text-sm font-semibold text-slate-950">Security boundaries are part of the product.</p><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Standard VeyraSec workflows do not use brute force, login bypass, destructive exploitation, or private-data access.</p></div>
            <Link href="/trust" className="text-sm font-semibold text-blue-700 hover:text-blue-800">Review trust & safety →</Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 px-6 py-14 lg:flex-row lg:items-center">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Start with one website</p><h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.03em]">Turn the next security review into a fix-and-retest workflow.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Run the first public review, keep findings with the website, and build evidence as remediation progresses.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row"><Link href="/signup" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">Start free</Link><Link href="/pricing" className="inline-flex items-center justify-center rounded-md border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-400 hover:bg-slate-900">Compare plans</Link></div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-9 text-xs text-slate-400 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p>© 2026 VeyraSec. Authorized website security review workflow.</p>
            <p className="mt-2 max-w-xl leading-5 text-slate-500">Security reports are decision-support outputs, not guarantees of complete security or compliance certification.</p>
          </div>
          <div className="flex max-w-2xl flex-wrap gap-x-5 gap-y-3 md:justify-end">
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/trust" className="hover:text-white">Trust</Link>
            <Link href="/legal/terms" className="hover:text-white">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/legal/refund" className="hover:text-white">Refunds</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link href="/login" className="hover:text-white">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
