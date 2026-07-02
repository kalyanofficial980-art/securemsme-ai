import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

type PortalSnapshot = {
  websiteUrl?: string;
  score?: number;
  riskLevel?: string;
  executiveSummary?: string;
  clientSafeFindings?: Array<{
    title: string;
    severity: string;
    summary: string;
    recommendedAction: string;
    confidence: string;
  }>;
  nextActions?: string[];
  safeClaims?: string[];
  blockedClaims?: string[];
  scanDate?: string | null;
};

function severityClass(severity: string) {
  if (severity === "Critical") return "bg-red-100 text-red-950";
  if (severity === "High") return "bg-red-50 text-red-800";
  if (severity === "Medium") return "bg-amber-50 text-amber-900";
  if (severity === "Low") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-800";
}

export default async function PublicClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_client_portal_link", { public_token: token })
    .maybeSingle();

  if (error || !data) notFound();

  const portal = data as {
    client_snapshot?: unknown;
    title: string;
    website_url: string;
    access_level: string;
    safe_disclaimer: string;
    expires_at: string;
  };

  const snapshot = (portal.client_snapshot || {}) as PortalSnapshot;
  const findings = snapshot.clientSafeFindings || [];
  const nextActions = snapshot.nextActions || [];
  const safeClaims = snapshot.safeClaims || [];
  const blockedClaims = snapshot.blockedClaims || [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Client security portal
        </p>
        <h1 className="mt-2 break-all text-4xl font-black">{portal.title}</h1>
        <p className="mt-3 break-all text-slate-600">
          {snapshot.websiteUrl || portal.website_url}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-black text-slate-500">Score</p>
            <p className="mt-3 text-5xl font-black">{snapshot.score ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-black text-slate-500">Risk</p>
            <p className="mt-3 text-2xl font-black">
              {snapshot.riskLevel || "Unknown risk"}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-black text-slate-500">Access</p>
            <p className="mt-3 text-2xl font-black">{portal.access_level}</p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h2 className="text-2xl font-black text-blue-950">
            Executive summary
          </h2>
          <p className="mt-4 leading-8 text-blue-900">
            {snapshot.executiveSummary ||
              "Client-safe summary is not available."}
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Client-safe findings</h2>
          <div className="mt-6 grid gap-4">
            {findings.length ? (
              findings.map((finding) => (
                <div
                  key={finding.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        Confidence: {finding.confidence}
                      </p>
                      <h3 className="mt-1 font-black">{finding.title}</h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${severityClass(finding.severity)}`}
                    >
                      {finding.severity}
                    </span>
                  </div>
                  <p className="mt-4 leading-7 text-slate-700">
                    {finding.summary}
                  </p>
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-black text-emerald-950">
                      Recommended action
                    </p>
                    <p className="mt-2 text-sm leading-6 text-emerald-900">
                      {finding.recommendedAction}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                No client-safe findings available.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Next actions</h2>
          <div className="mt-6 grid gap-3">
            {nextActions.map((action) => (
              <div
                key={action}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700"
              >
                {action}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
            <h2 className="text-2xl font-black text-emerald-950">
              Safe claims
            </h2>
            <div className="mt-5 grid gap-3">
              {safeClaims.map((claim) => (
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
            <h2 className="text-2xl font-black text-red-950">
              What this does not claim
            </h2>
            <div className="mt-5 grid gap-3">
              {blockedClaims.map((claim) => (
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

        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-bold leading-7 text-amber-900">
            {portal.safe_disclaimer}
          </p>
          <p className="mt-3 text-sm font-bold text-amber-800">
            Link expires: {new Date(portal.expires_at).toLocaleString()}
          </p>
        </div>
      </section>
    </main>
  );
}
