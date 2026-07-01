import type { ScanReport } from "./scanner";

export function calculateScore(report: ScanReport) {
  const score = report.findings.reduce(
    (total, finding) => total + finding.points,
    0,
  );

  let riskLevel: "Low" | "Medium" | "High" = "High";

  if (score >= 80) {
    riskLevel = "Low";
  } else if (score >= 50) {
    riskLevel = "Medium";
  }

  const topFixes = report.findings
    .filter((finding) => finding.status !== "pass")
    .sort((a, b) => b.maxPoints - b.points - (a.maxPoints - a.points))
    .slice(0, 5)
    .map((finding) => ({
      name: finding.name,
      message: finding.message,
      lostPoints: finding.maxPoints - finding.points,
    }));

  return {
    score,
    riskLevel,
    topFixes,
  };
}
