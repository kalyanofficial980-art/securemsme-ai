import type { DeepScanV1Report } from "@/lib/deep-scan-v1";

function statusClass(status: string) {
  if (status === "completed" || status === "assessed" || status === "evidence-backed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  if (status === "failed" || status === "blocked") {
    return "border-red-200 bg-red-50 text-red-900";
  }
  if (status === "not-assessed" || status === "skipped" || status === "informational") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function severityClass(severity: string) {
  const value = severity.toLowerCase();
  if (value === "critical" || value === "high") return "border-red-200 bg-red-50 text-red-900";
  if (value === "medium") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
      {note ? <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p> : null}
    </div>
  );
}

export function DeepScanV1Panel({ report }: { report: DeepScanV1Report }) {
  const evidenceBacked = report.findings.filter((finding) => finding.status === "evidence-backed").length;
  const reviewSignals = report.findings.filter((finding) => finding.status === "review-signal").length;

  return (
    <section className="mt-8 border border-slate-300 bg-white">
      <div className="border-b border-slate-200 bg-slate-950 px-6 py-6 text-white sm:px-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-300">Deep Scan V1</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Multi-engine verified-scope security review
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
              Attack Surface, API Security, Browser Security, authorized safe vulnerability review, technology/CVE certainty and explicit OWASP coverage. Advanced evidence never silently changes the canonical Security Score.
            </p>
          </div>
          <div className={`self-start rounded-md border px-3 py-1.5 text-xs font-semibold uppercase ${statusClass(report.status)}`}>
            {report.status.replaceAll("-", " ")}
          </div>
        </div>
      </div>

      <div className="grid border-b border-slate-200 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Coverage confidence" value={report.coverage.confidence} />
        <Stat label="Pages observed" value={report.attackSurface.pagesObserved} />
        <Stat label="API endpoints" value={report.apiSecurity.endpoints} />
        <Stat label="Evidence-backed" value={evidenceBacked} />
        <Stat label="Review signals" value={reviewSignals} />
      </div>

      {!report.truthGate.representativeResponse ? (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-5 text-sm leading-6 text-amber-950 sm:px-8">
          <p className="font-semibold">Deep coverage is inconclusive — no vulnerability penalty applied.</p>
          <p className="mt-1">{report.truthGate.reason}</p>
        </div>
      ) : null}

      <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Engine execution</p>
            <h3 className="mt-2 text-xl font-semibold">What actually ran</h3>
          </div>
          <p className="text-xs text-slate-500">No simulated engine results</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {report.engineRuns.map((engine) => (
            <div key={engine.id} className="border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{engine.label}</p>
                <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase ${statusClass(engine.status)}`}>
                  {engine.status.replaceAll("-", " ")}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-600">{engine.summary}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid border-b border-slate-200 lg:grid-cols-3">
        <div className="p-6 sm:p-8 lg:border-r lg:border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Attack surface</p>
          <h3 className="mt-2 text-xl font-semibold">Discovered public surface</h3>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Routes", report.attackSurface.routes],
              ["API-like", report.attackSurface.apiEndpoints],
              ["Forms", report.attackSurface.forms],
              ["Parameters", report.attackSurface.parameters],
              ["Scripts", report.attackSurface.scripts],
              ["JS routes", report.attackSurface.jsRoutes],
            ].map(([label, value]) => (
              <div key={String(label)} className="border border-slate-200 p-3">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-1 text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="border-t border-slate-200 p-6 sm:p-8 lg:border-r lg:border-t-0 lg:border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">API security</p>
          <h3 className="mt-2 text-xl font-semibold">Inventory without mutation</h3>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">API documents</dt><dd className="font-semibold">{report.apiSecurity.documents}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Endpoints</dt><dd className="font-semibold">{report.apiSecurity.endpoints}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Mutation methods inventoried</dt><dd className="font-semibold">{report.apiSecurity.mutationMethodsInventoried}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Mutation methods executed</dt><dd className="font-semibold text-emerald-700">0</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Auth unknown</dt><dd className="font-semibold">{report.apiSecurity.authUnknown}</dd></div>
          </dl>
        </div>

        <div className="border-t border-slate-200 p-6 sm:p-8 lg:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Browser security</p>
          <h3 className="mt-2 text-xl font-semibold">Client-side control evidence</h3>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Observed pages</dt><dd className="font-semibold">{report.browserSecurity.pagesObserved}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Diagnostic score</dt><dd className="font-semibold">{report.browserSecurity.score ?? "N/A"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">CSP signals</dt><dd className="font-semibold">{report.browserSecurity.cspFindings}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">CORS signals</dt><dd className="font-semibold">{report.browserSecurity.corsFindings}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Cookie signals</dt><dd className="font-semibold">{report.browserSecurity.cookieFindings}</dd></div>
          </dl>
        </div>
      </div>

      <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">OWASP Top 10</p>
        <h3 className="mt-2 text-xl font-semibold">Truthful coverage — not a fake pass matrix</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {report.owaspTop10Coverage.map((control) => (
            <div key={control.id} className="border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <p className="font-semibold">{control.id} · {control.title}</p>
                <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold uppercase ${statusClass(control.status)}`}>
                  {control.status.replaceAll("-", " ")}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-700">{control.evidence}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Limit: {control.limitation}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Advanced evidence</p>
            <h3 className="mt-2 text-xl font-semibold">Evidence-backed observations vs review signals</h3>
          </div>
          <p className="text-xs text-slate-500">{report.findings.length} deep evidence item(s)</p>
        </div>
        <div className="mt-5 divide-y divide-slate-200 border border-slate-200">
          {report.findings.length ? report.findings.slice(0, 24).map((finding) => (
            <article key={finding.id} className="grid gap-4 p-5 lg:grid-cols-[170px_1fr]">
              <div className="flex flex-wrap content-start gap-2">
                <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${severityClass(finding.severity)}`}>{finding.severity}</span>
                <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${statusClass(finding.status)}`}>{finding.status.replaceAll("-", " ")}</span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{finding.source} · {finding.category}</p>
                <h4 className="mt-1 font-semibold">{finding.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{finding.evidenceSummary}</p>
                <p className="mt-3 text-sm leading-6 text-slate-700"><span className="font-semibold text-slate-950">Fix:</span> {finding.developerFix}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Confidence {finding.confidence} · false-positive risk {finding.falsePositiveRisk}. {finding.blockedClaim}</p>
              </div>
            </article>
          )) : (
            <p className="p-6 text-sm text-slate-600">No advanced evidence item was claimed by the completed modules.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 bg-slate-50 px-6 py-6 text-xs leading-5 text-slate-600 sm:px-8 lg:grid-cols-2">
        <div>
          <p className="font-semibold uppercase tracking-[0.1em] text-slate-800">Safe testing boundary</p>
          <ul className="mt-3 space-y-1.5">
            {report.safeBoundary.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-[0.1em] text-slate-800">Interpretation</p>
          <p className="mt-3">{report.customerSummary}</p>
          <p className="mt-3 font-medium text-slate-700">{report.canonicalScorePolicy}</p>
        </div>
      </div>
    </section>
  );
}
