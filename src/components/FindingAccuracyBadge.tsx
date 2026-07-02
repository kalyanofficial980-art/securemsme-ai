import {
  accuracyStatusLabels,
  evidenceQualityLabels,
  type EvidenceQuality,
  type FindingAccuracyStatus,
} from "@/lib/advanced-finding-taxonomy";

function statusClass(status: string) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-950";
  if (status === "high-confidence") return "bg-blue-100 text-blue-950";
  if (status === "potential") return "bg-amber-100 text-amber-950";
  if (status === "needs-manual-review") return "bg-orange-100 text-orange-950";
  if (status === "false-positive") return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export function FindingAccuracyBadge({
  status,
  score,
  evidenceQuality,
}: {
  status: FindingAccuracyStatus;
  score: number;
  evidenceQuality: EvidenceQuality;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusClass(status)}`}
    >
      {accuracyStatusLabels[status]} · {score}/100 ·{" "}
      {evidenceQualityLabels[evidenceQuality]}
    </span>
  );
}
