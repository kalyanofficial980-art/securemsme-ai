import Link from "next/link";
import {
  customerNotClaim,
  customerReportLinks,
  customerSafeClaim,
  developerHandoffMessage,
} from "@/lib/customer-language";

type CustomerReportHubProps = {
  scanId: string;
  websiteUrl: string;
  score: number;
  riskLevel: string;
  createdAt: string;
  topFixes: Array<{
    name?: string;
    title?: string;
    severity?: string;
    businessImpact?: string;
    developerFix?: string;
    recommendation?: string;
  }>;
};

function riskTone(riskLevel: string) {
  const risk = riskLevel.toLowerCase();

  if (risk.includes("high")) return "border-red-200 bg-red-50 text-red-950";
  if (risk.includes("medium"))
    return "border-amber-200 bg-amber-50 text-amber-950";

  return "border-emerald-200 bg-emerald-50 text-emerald-950";
}

export function CustomerReportHub({
  scanId,
  websiteUrl,
  score,
  riskLevel,
  createdAt,
  topFixes,
}: CustomerReportHubProps) {
  const visibleLinks = customerReportLinks.filter(
    (item) => item.customerVisible,
  );

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-black text-slate-500">Customer report hub</p>
        <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="break-all text-4xl font-black">{websiteUrl}</h1>
            <p className="mt-3 text-slate-600">
              Report generated on {new Date(createdAt).toLocaleString()}
            </p>
          </div>

          <div className={`rounded-3xl border p-6 ${riskTone(riskLevel)}`}>
            <p className="text-sm font-black">Website security score</p>
            <p className="mt-1 text-5xl font-black">{score}</p>
            <p className="mt-2 font-bold">Risk level: {riskLevel}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-black text-emerald-950">What this report is</p>
            <p className="mt-2 text-sm leading-6 text-emerald-900">
              {customerSafeClaim()}
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-black text-red-950">What this report is not</p>
            <p className="mt-2 text-sm leading-6 text-red-900">
              {customerNotClaim()}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="font-black text-blue-950">What to do next</p>
            <p className="mt-2 text-sm leading-6 text-blue-900">
              {developerHandoffMessage()}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-black">Priority fixes</h2>
        <div className="mt-6 grid gap-4">
          {topFixes.length ? (
            topFixes.slice(0, 5).map((fix, index) => (
              <div
                key={`${fix.name || fix.title || "fix"}-${index}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <h3 className="font-black">
                    {fix.name || fix.title || "Recommended fix"}
                  </h3>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                    {fix.severity || "Review"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {fix.businessImpact ||
                    "This item can affect website trust or security posture."}
                </p>
                <p className="mt-3 text-sm font-bold leading-6 text-slate-800">
                  Developer task:{" "}
                  {fix.developerFix ||
                    fix.recommendation ||
                    "Review the finding and apply the recommended security fix."}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-600">
              No priority fixes were available in this report.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-black">Report sections</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href(scanId)}
              className={
                item.primary
                  ? "rounded-3xl border border-slate-950 bg-slate-950 p-6 text-white hover:bg-slate-800"
                  : "rounded-3xl border border-slate-200 bg-slate-50 p-6 hover:bg-slate-100"
              }
            >
              <h3 className="font-black">{item.label}</h3>
              <p
                className={
                  item.primary
                    ? "mt-2 text-sm leading-6 text-slate-300"
                    : "mt-2 text-sm leading-6 text-slate-600"
                }
              >
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
