import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminScanConsistencyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login as admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin")
    redirect("/dashboard?message=Admin access required");

  const { data: reports } = await supabase
    .from("scan_consistency_reports")
    .select(
      "id, website_url, engine_version, current_score, previous_score, score_delta, current_risk, previous_risk, risk_transition, confidence_level, customer_summary, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          Scan consistency observability
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor score changes, risk transitions, confidence level and customer
          explanation reports.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest consistency reports</h2>
          <div className="mt-6 grid gap-4">
            {reports?.length ? (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">
                        {report.website_url}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(report.created_at).toLocaleString()} · engine{" "}
                        {report.engine_version}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {report.customer_summary}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black">
                      {report.risk_transition}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Current</p>
                      <p className="text-2xl font-black">
                        {report.current_score}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Previous</p>
                      <p className="text-2xl font-black">
                        {report.previous_score ?? "N/A"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Delta</p>
                      <p className="text-2xl font-black">
                        {report.score_delta ?? "N/A"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Risk</p>
                      <p className="text-lg font-black">
                        {report.current_risk}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Confidence</p>
                      <p className="text-2xl font-black">
                        {report.confidence_level}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No consistency reports yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
