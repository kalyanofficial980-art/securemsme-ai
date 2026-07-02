import { generateReportTruthCleanup } from "@/app/report/[id]/truth-cleanup/actions";

type TruthReview = {
  id: string;
  website_url: string;
  engine_version: string;
  review_status: string;
  truth_score: number;
  fake_risk_level: string;
  generic_text_count: number;
  repeated_fix_count: number;
  missing_evidence_count: number;
  cleaned_fix_count: number;
  manual_review_count: number;
  review_summary?: {
    customerSummary?: string;
    developerSummary?: string;
    oldReportProblem?: string;
    newReportRule?: string;
    trustPositioning?: string;
  } | null;
  truth_warnings?: Array<{
    title: string;
    severity: string;
    message: string;
    fix: string;
  }> | null;
  customer_safe_claims?: string[] | null;
  blocked_claims?: string[] | null;
  created_at: string;
};

type TruthFix = {
  id: string;
  issue_key: string;
  category: string;
  title: string;
  severity: string;
  confidence: string;
  evidence_status: string;
  original_text?: string | null;
  evidence_summary: string;
  why_it_matters: string;
  exact_developer_fix: string;
  validation_steps: string;
  safe_customer_wording: string;
  cannot_claim: string;
  source_module: string;
};

function riskClass(risk: string) {
  if (risk === "high") return "bg-red-50 text-red-900 border-red-200";
  if (risk === "medium") return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-emerald-50 text-emerald-900 border-emerald-200";
}

function severityClass(severity: string) {
  if (severity === "Critical") return "bg-red-100 text-red-950";
  if (severity === "High") return "bg-red-50 text-red-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-900";
  if (severity === "Low") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-800";
}

function warningClass(severity: string) {
  if (severity === "High") return "border-red-200 bg-red-50 text-red-950";
  if (severity === "Medium")
    return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-blue-200 bg-blue-50 text-blue-950";
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
    </div>
  );
}

export function ReportTruthCleanupPanel({
  scanId,
  websiteUrl,
  score,
  riskLevel,
  reviews,
  fixes,
  message,
}: {
  scanId: string;
  websiteUrl: string;
  score: number;
  riskLevel: string;
  reviews: TruthReview[];
  fixes: TruthFix[];
  message?: string;
}) {
  const latest = reviews[0];

  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black text-slate-500">
              Report Truth Cleanup + Evidence-Specific Fix Engine
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Remove fake-looking generic wording from customer reports
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Detects generic report text, repeated fixes and missing evidence.
              Creates exact developer fixes, validation steps, safe customer
              wording and cannot-claim rules.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black">
            {score}/100 · {riskLevel}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="break-all font-black">{websiteUrl}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This cleanup does not fake new findings. It rewrites old generic
            findings into evidence-specific, safe, customer-ready wording.
          </p>
        </div>

        <form action={generateReportTruthCleanup} className="mt-8">
          <input type="hidden" name="scanId" value={scanId} />
          <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Generate truth cleanup
          </button>
        </form>
      </div>

      {latest ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard label="Truth score" value={latest.truth_score} />
            <StatCard label="Generic text" value={latest.generic_text_count} />
            <StatCard
              label="Repeated fixes"
              value={latest.repeated_fix_count}
            />
            <StatCard
              label="Missing evidence"
              value={latest.missing_evidence_count}
            />
            <StatCard label="Cleaned fixes" value={latest.cleaned_fix_count} />
          </div>

          <div
            className={`rounded-3xl border p-8 ${riskClass(latest.fake_risk_level)}`}
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <h3 className="text-2xl font-black">
                  Fake-looking risk: {latest.fake_risk_level}
                </h3>
                <p className="mt-3 max-w-3xl leading-7">
                  {latest.review_summary?.customerSummary}
                </p>
              </div>
              <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-black">
                Engine {latest.engine_version}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Truth rules</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <h4 className="font-black text-red-950">Old problem</h4>
                <p className="mt-2 text-sm leading-6 text-red-900">
                  {latest.review_summary?.oldReportProblem}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <h4 className="font-black text-emerald-950">New rule</h4>
                <p className="mt-2 text-sm leading-6 text-emerald-900">
                  {latest.review_summary?.newReportRule}
                </p>
              </div>
            </div>

            <p className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-900">
              {latest.review_summary?.trustPositioning}
            </p>
          </div>

          {latest.truth_warnings?.length ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-black">Truth warnings</h3>
              <div className="mt-6 grid gap-4">
                {latest.truth_warnings.map((warning) => (
                  <div
                    key={warning.title}
                    className={`rounded-2xl border p-5 ${warningClass(warning.severity)}`}
                  >
                    <h4 className="font-black">{warning.title}</h4>
                    <p className="mt-2 text-sm leading-6">{warning.message}</p>
                    <p className="mt-2 text-sm font-bold">Fix: {warning.fix}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">
              Evidence-specific cleaned fixes
            </h3>
            <div className="mt-6 grid gap-4">
              {fixes.length ? (
                fixes.map((fix) => (
                  <div
                    key={fix.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {fix.category} · {fix.confidence} confidence ·{" "}
                          {fix.evidence_status}
                        </p>
                        <h4 className="mt-1 font-black">{fix.title}</h4>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Source: {fix.source_module}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(fix.severity)}`}
                      >
                        {fix.severity}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4">
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-sm font-black text-slate-500">
                          Evidence
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {fix.evidence_summary}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-sm font-black text-slate-500">
                          Why it matters
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {fix.why_it_matters}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm font-black text-emerald-950">
                          Exact developer fix
                        </p>
                        <p className="mt-2 text-sm leading-6 text-emerald-900">
                          {fix.exact_developer_fix}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <p className="text-sm font-black text-blue-950">
                          Validation steps
                        </p>
                        <p className="mt-2 text-sm leading-6 text-blue-900">
                          {fix.validation_steps}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-black text-red-950">
                          Cannot claim
                        </p>
                        <p className="mt-2 text-sm leading-6 text-red-900">
                          {fix.cannot_claim}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
                  No cleaned fixes generated yet.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
              <h3 className="text-2xl font-black text-emerald-950">
                Safe claims
              </h3>
              <div className="mt-5 grid gap-3">
                {(latest.customer_safe_claims || []).map((claim) => (
                  <div
                    key={claim}
                    className="rounded-2xl bg-white/80 p-4 text-sm font-bold text-emerald-900"
                  >
                    {claim}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
              <h3 className="text-2xl font-black text-red-950">
                Blocked claims
              </h3>
              <div className="mt-5 grid gap-3">
                {(latest.blocked_claims || []).map((claim) => (
                  <div
                    key={claim}
                    className="rounded-2xl bg-white/80 p-4 text-sm font-bold text-red-900"
                  >
                    {claim}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h3 className="text-2xl font-black">Saved truth cleanup reports</h3>
            <div className="mt-6 grid gap-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="break-all font-black">
                        {review.website_url}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {new Date(review.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${riskClass(review.fake_risk_level)}`}
                    >
                      truth {review.truth_score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <h3 className="text-2xl font-black">
            No truth cleanup generated yet
          </h3>
          <p className="mt-3 leading-7 text-slate-600">
            Generate cleanup to replace generic old report text with
            evidence-specific fixes and safe customer wording.
          </p>
        </div>
      )}
    </section>
  );
}
