import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSecurityEnginePage() {
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

  const { data: jobs } = await supabase
    .from("international_scan_jobs")
    .select(
      "id, target_url, status, intensity, verified_scope, app_classification, coverage_score, evidence_count, vulnerability_count, high_priority_count, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          International security engine observability
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor engine jobs, coverage scores, selected modules, evidence
          counts, and vulnerability lifecycle seeds.
        </p>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest engine jobs</h2>
          <div className="mt-6 grid gap-4">
            {jobs?.length ? (
              jobs.map((job) => {
                const classification = job.app_classification as {
                  siteType?: string;
                  confidence?: string;
                } | null;
                return (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="break-all font-black">{job.target_url}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {classification?.siteType || "unknown"} ·{" "}
                          {classification?.confidence || "N/A"} confidence ·{" "}
                          {job.intensity}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {new Date(job.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-900">
                        {job.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-sm font-bold text-slate-600">
                          Coverage
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {job.coverage_score}%
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-sm font-bold text-slate-600">
                          Evidence
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {job.evidence_count}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-sm font-bold text-slate-600">
                          Vulnerabilities
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {job.vulnerability_count}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <p className="text-sm font-bold text-slate-600">
                          High priority
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {job.high_priority_count}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-600">
                No international engine jobs yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
