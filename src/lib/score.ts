import type { ScanFinding, ScanReport } from "./scanner";

type CategoryScore = {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
};

function getCategory(finding: ScanFinding) {
  if (
    finding.name.includes("HTTPS") ||
    finding.name.includes("Security headers") ||
    finding.name.includes("admin")
  ) {
    return "Website security";
  }

  if (
    finding.name.includes("Privacy") ||
    finding.name.includes("Terms") ||
    finding.name.includes("Contact")
  ) {
    return "Trust and privacy";
  }

  return "General";
}

export function calculateScore(report: ScanReport) {
  const score = report.findings.reduce(
    (total, finding) => total + finding.points,
    0,
  );
  const maxScore = report.findings.reduce(
    (total, finding) => total + finding.maxPoints,
    0,
  );

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  let riskLevel: "Low" | "Medium" | "High" = "High";
  let summary =
    "This website has important safety and trust gaps that should be fixed soon.";

  if (percentage >= 80) {
    riskLevel = "Low";
    summary =
      "This website passed most basic safety checks, but regular monitoring is still recommended.";
  } else if (percentage >= 50) {
    riskLevel = "Medium";
    summary =
      "This website has some safety and trust gaps. Fixing the top issues can improve customer trust.";
  }

  const categoryMap = new Map<string, { score: number; maxScore: number }>();

  for (const finding of report.findings) {
    const category = getCategory(finding);
    const existing = categoryMap.get(category) ?? { score: 0, maxScore: 0 };

    existing.score += finding.points;
    existing.maxScore += finding.maxPoints;

    categoryMap.set(category, existing);
  }

  const categoryScores: CategoryScore[] = Array.from(categoryMap.entries()).map(
    ([name, value]) => ({
      name,
      score: value.score,
      maxScore: value.maxScore,
      percentage:
        value.maxScore > 0
          ? Math.round((value.score / value.maxScore) * 100)
          : 0,
    }),
  );

  const failedChecks = report.findings.filter(
    (finding) => finding.status === "fail",
  ).length;

  const warningChecks = report.findings.filter(
    (finding) => finding.status === "warning",
  ).length;

  const passedChecks = report.findings.filter(
    (finding) => finding.status === "pass",
  ).length;

  const topFixes = report.findings
    .filter((finding) => finding.status !== "pass")
    .sort((a, b) => b.maxPoints - b.points - (a.maxPoints - a.points))
    .slice(0, 5)
    .map((finding) => ({
      name: finding.name,
      message: finding.message,
      lostPoints: finding.maxPoints - finding.points,
      priority: finding.status === "fail" ? "High priority" : "Medium priority",
    }));

  return {
    score: percentage,
    rawScore: score,
    maxScore,
    riskLevel,
    summary,
    categoryScores,
    passedChecks,
    warningChecks,
    failedChecks,
    topFixes,
  };
}
