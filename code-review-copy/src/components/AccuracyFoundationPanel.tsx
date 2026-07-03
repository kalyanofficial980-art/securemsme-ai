import {
  assessScanFindingsAction,
  validateAccuracyAssessmentAction,
} from "@/app/accuracy/actions";
import {
  accuracyOperatingRules,
  accuracyStatusLabels,
  evidenceQualityLabels,
  type FindingAccuracyStatus,
  type EvidenceQuality,
} from "@/lib/advanced-finding-taxonomy";

type Assessment = {
  id: string;
  taxonomy_key?: string | null;
  category: string;
  severity: string;
  accuracy_status: FindingAccuracyStatus;
  confidence_score: number;
  false_positive_risk: string;
  evidence_count: number;
  required_evidence_met: boolean;
  evidence_quality: EvidenceQuality;
  accuracy_reason: string;
  client_safe_claim: string;
  blocked_claim: string;
  needs_expert_review: boolean;
  expert_review_status: string;
  validation_notes?: string | null;
  created_at: string;
};

type Metric = {
  total_assessments: number;
  confirmed_count: number;
  high_confidence_count: number;
  potential_count: number;
  needs_review_count: number;
  false_positive_count: number;
  accepted_risk_count: number;
  confirmed_accuracy_target: number;
  estimated_confirmed_accuracy: number;
  false_positive_rate: number;
};

function statusClass(status: string) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-950";
  if (status === "high-confidence") return "bg-blue-100 text-blue-950";
  if (status === "potential") return "bg-amber-100 text-amber-950";
  if (status === "needs-manual-review") return "bg-orange-100 text-orange-950";
  if (status === "false-positive") return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

function severityClass(severity: string) {
  if (severity === "Critical") return "bg-red-700 text-white";
  if (severity === "High") return "bg-red-100 text-red-950";
  if (severity === "Medium") return "bg-amber-100 text-amber-950";
  if (severity === "Low") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-800";
}

function Stat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-black text-slate-500">{label}</p>
      <p className="mt-3 text-4xl font-black text-slate-950">{value}</p>
      {helper ? (
        <p className="mt-2 text-sm font-bold text-slate-600">{helper}</p>
      ) : null}
    </div>
  );
}

function AssessmentCard({
  assessment,
  returnPath,
  allowValidation,
}: {
  assessment: Assessment;
  returnPath: string;
  allowValidation?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">
            {assessment.category} · {assessment.taxonomy_key || "unclassified"}
          </p>
          <h3 className="mt-2 text-xl font-black">
            {accuracyStatusLabels[assessment.accuracy_status]} ·{" "}
            {assessment.confidence_score}/100
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(assessment.severity)}`}
          >
            {assessment.severity}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(assessment.accuracy_status)}`}
          >
            {accuracyStatusLabels[assessment.accuracy_status]}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
            FP risk {assessment.false_positive_risk}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black">Evidence</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {evidenceQualityLabels[assessment.evidence_quality]} ·{" "}
            {assessment.evidence_count} signal(s)
          </p>
          <p className="mt-1 text-sm font-bold text-slate-600">
            Required met: {assessment.required_evidence_met ? "Yes" : "No"}
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-4">
          <p className="text-sm font-black text-blue-950">Safe claim</p>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            {assessment.client_safe_claim}
          </p>
        </div>
        <div className="rounded-2xl bg-red-50 p-4">
          <p className="text-sm font-black text-red-950">Blocked claim</p>
          <p className="mt-2 text-sm leading-6 text-red-900">
            {assessment.blocked_claim}
          </p>
        </div>
      </div>

      <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        {assessment.accuracy_reason}
      </p>

      {allowValidation ? (
        <form
          action={validateAccuracyAssessmentAction}
          className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <input type="hidden" name="assessmentId" value={assessment.id} />
          <input type="hidden" name="returnPath" value={returnPath} />

          <div className="grid gap-3 md:grid-cols-3">
            <select
              name="decision"
              defaultValue={assessment.accuracy_status}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold"
            >
              <option value="confirmed">Confirmed</option>
              <option value="high-confidence">High Confidence</option>
              <option value="potential">Potential</option>
              <option value="needs-manual-review">Needs Manual Review</option>
              <option value="false-positive">False Positive</option>
              <option value="accepted-risk">Accepted Risk</option>
            </select>
            <input
              name="evidenceNote"
              placeholder="Evidence note"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
            />
            <input
              name="reviewerNote"
              placeholder="Reviewer note"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
            />
          </div>

          <button className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
            Save validation
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function AccuracyFoundationPanel({
  scanId,
  assessments,
  metric,
  message,
  returnPath,
  allowValidation = false,
}: {
  scanId?: string;
  assessments: Assessment[];
  metric?: Metric | null;
  message?: string;
  returnPath: string;
  allowValidation?: boolean;
}) {
  const confirmedAccuracy = metric?.estimated_confirmed_accuracy || 0;
  const targetMet = confirmedAccuracy >= 99;

  return (
    <section className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
        <p className="text-sm font-black text-blue-700">Accuracy foundation</p>
        <h1 className="mt-2 max-w-4xl text-4xl font-black text-blue-950">
          Advanced Finding Taxonomy + 99% Confirmed-Finding Accuracy System
        </h1>
        <p className="mt-4 max-w-3xl leading-8 text-blue-900">
          This system separates Confirmed findings from Potential risk signals.
          The 99% target applies to correctness of Confirmed findings, with
          evidence gates, false-positive control and expert validation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          label="Confirmed accuracy"
          value={`${confirmedAccuracy}%`}
          helper={targetMet ? "Target met" : "Target: 99%"}
        />
        <Stat
          label="Assessments"
          value={metric?.total_assessments || assessments.length}
          helper="All reviewed findings"
        />
        <Stat
          label="Confirmed"
          value={metric?.confirmed_count || 0}
          helper="Strongest wording allowed"
        />
        <Stat
          label="False positive rate"
          value={`${metric?.false_positive_rate || 0}%`}
          helper="Must stay low"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Stat
          label="High confidence"
          value={metric?.high_confidence_count || 0}
        />
        <Stat label="Potential" value={metric?.potential_count || 0} />
        <Stat label="Needs review" value={metric?.needs_review_count || 0} />
        <Stat
          label="False positive"
          value={metric?.false_positive_count || 0}
        />
        <Stat label="Accepted risk" value={metric?.accepted_risk_count || 0} />
      </div>

      {scanId ? (
        <form
          action={assessScanFindingsAction}
          className="rounded-3xl border border-slate-200 bg-white p-8"
        >
          <input type="hidden" name="scanId" value={scanId} />
          <h2 className="text-2xl font-black">Generate accuracy assessments</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Run after Vulnerability Scanner. It will classify findings,
            calculate confidence, enforce evidence requirements and queue risky
            findings for expert review.
          </p>
          <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
            Assess scanner findings
          </button>
        </form>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-black">Operating rules for 99% target</h2>
        <div className="mt-5 grid gap-3">
          {accuracyOperatingRules.map((rule) => (
            <div
              key={rule}
              className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700"
            >
              {rule}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-black">Finding accuracy assessments</h2>
        <div className="mt-6 grid gap-5">
          {assessments.length ? (
            assessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                returnPath={returnPath}
                allowValidation={allowValidation}
              />
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
              No assessments yet. Run Vulnerability Scanner first, then click
              Assess scanner findings.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
