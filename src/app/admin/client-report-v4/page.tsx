import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (["ready", "positive"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["needs-review", "warning"].includes(value))
    return "bg-amber-100 text-amber-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminClientReportV4Page() {
  const supabase = (await createClient()) as any;
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

  const { data: snapshots } = await supabase
    .from("client_report_v4_snapshots")
    .select(
      "id, target_url, report_status, executive_score, report_readiness_score, business_risk_score, evidence_strength_score, confirmed_count, needs_manual_review_count, open_action_count, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Client Report v4 Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor report readiness, business risk, evidence strength and
          client-safe reporting status.
        </p>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent report snapshots</h2>
          <div className="mt-6 grid gap-4">
            {snapshots?.length ? (
              snapshots.map((snapshot: any) => (
                <div
                  key={snapshot.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">
                        {snapshot.target_url}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        executive {snapshot.executive_score}/100 · readiness{" "}
                        {snapshot.report_readiness_score}/100 · risk{" "}
                        {snapshot.business_risk_score}/100 · evidence{" "}
                        {snapshot.evidence_strength_score}/100
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(snapshot.report_status)}`}
                    >
                      {snapshot.report_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">
                No Client Report v4 snapshots yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
