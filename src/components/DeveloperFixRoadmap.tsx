type FixItem = {
  name?: string;
  title?: string;
  severity?: string;
  category?: string;
  description?: string;
  businessImpact?: string;
  recommendation?: string;
  developerFix?: string;
  status?: string;
};

type DeveloperFixRoadmapProps = {
  websiteUrl: string;
  score: number;
  riskLevel: string;
  findings: FixItem[];
};

function severityRank(severity?: string) {
  const text = String(severity || "").toLowerCase();

  if (text.includes("critical")) return 5;
  if (text.includes("high")) return 4;
  if (text.includes("medium")) return 3;
  if (text.includes("low")) return 2;
  return 1;
}

function getFix(item: FixItem) {
  return (
    item.developerFix ||
    item.recommendation ||
    "Review this finding and apply the recommended security hardening control."
  );
}

function getTitle(item: FixItem) {
  return item.name || item.title || "Security fix";
}

function getPhase(index: number, severity?: string) {
  const rank = severityRank(severity);

  if (rank >= 4) return "Fix today";
  if (rank === 3) return "Fix this week";
  if (index <= 6) return "Improve this month";

  return "Monitor later";
}

export function DeveloperFixRoadmap({
  websiteUrl,
  score,
  riskLevel,
  findings,
}: DeveloperFixRoadmapProps) {
  const actionable = findings
    .filter((item) => String(item.status || "").toLowerCase() !== "pass")
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const visible = actionable.length ? actionable : findings.slice(0, 10);

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-black text-slate-500">
          Developer handoff checklist
        </p>
        <h1 className="mt-2 break-all text-4xl font-black">{websiteUrl}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Give this roadmap to the website developer. Fix high-impact items
          first, then rescan to prove improvement.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-sm text-slate-300">Current score</p>
            <p className="mt-1 text-4xl font-black">{score}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Risk level</p>
            <p className="mt-1 text-3xl font-black">{riskLevel}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Action items</p>
            <p className="mt-1 text-3xl font-black">{visible.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-2xl font-black">Fix roadmap</h2>
        <div className="mt-6 grid gap-5">
          {visible.map((item, index) => {
            const phase = getPhase(index, item.severity);

            return (
              <div
                key={`${getTitle(item)}-${index}`}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {phase} · {item.category || "Security"}
                    </p>
                    <h3 className="mt-1 text-xl font-black">
                      {getTitle(item)}
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                    {item.severity || "Review"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
                  {item.description ? (
                    <p>
                      <span className="font-black text-slate-950">Issue:</span>{" "}
                      {item.description}
                    </p>
                  ) : null}
                  {item.businessImpact ? (
                    <p>
                      <span className="font-black text-slate-950">
                        Business impact:
                      </span>{" "}
                      {item.businessImpact}
                    </p>
                  ) : null}
                  <p>
                    <span className="font-black text-slate-950">
                      Developer fix:
                    </span>{" "}
                    {getFix(item)}
                  </p>
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">
                    After fix: rescan this website and compare score
                    improvement.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
