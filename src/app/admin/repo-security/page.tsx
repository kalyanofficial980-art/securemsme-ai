import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (
    [
      "Info",
      "Low",
      "active",
      "fixed",
      "rotated",
      "revoked",
      "resolved",
    ].includes(value)
  )
    return "bg-emerald-100 text-emerald-950";
  if (["Medium", "needs-review", "open"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["High", "Critical"].includes(value)) return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminRepoSecurityPage() {
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

  const { data: projects } = await supabase
    .from("repo_security_projects_v2")
    .select(
      "id, project_name, repo_url, repo_provider, project_status, latest_risk_score, latest_risk_level, latest_summary, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: alerts } = await supabase
    .from("repo_security_alerts_v2")
    .select(
      "id, alert_type, alert_status, severity, alert_title, client_safe_summary, developer_action, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: findings } = await supabase
    .from("repo_secret_findings_v2")
    .select(
      "id, secret_type, masked_value, risk_level, confidence_level, finding_status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: events } = await supabase
    .from("repo_security_events_v2")
    .select("id, event_type, severity, title, details, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Repo Security Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor repository projects, dependency risk, masked secret findings
          and repo security events.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Projects</h2>
          <div className="mt-6 grid gap-4">
            {projects?.length ? (
              projects.map((project: any) => (
                <div
                  key={project.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">{project.project_name}</p>
                      <p className="mt-2 break-all text-sm text-slate-600">
                        {project.repo_url || "Manual input"}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {project.latest_summary || "No scan yet"}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(project.latest_risk_level)}`}
                    >
                      {project.latest_risk_level} · {project.latest_risk_score}
                      /100
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No repo projects yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Alerts</h2>
            <div className="mt-6 grid gap-3">
              {alerts?.length ? (
                alerts.map((alert: any) => (
                  <div key={alert.id} className="rounded-2xl bg-slate-50 p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(alert.severity)}`}
                    >
                      {alert.severity}
                    </span>
                    <p className="mt-3 font-black">{alert.alert_title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {alert.client_safe_summary}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No alerts yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Masked secret findings</h2>
            <div className="mt-6 grid gap-3">
              {findings?.length ? (
                findings.map((finding: any) => (
                  <div key={finding.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(finding.risk_level)}`}
                      >
                        {finding.risk_level}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(finding.finding_status)}`}
                      >
                        {finding.finding_status}
                      </span>
                    </div>
                    <p className="mt-3 font-black">{finding.secret_type}</p>
                    <p className="mt-1 break-all text-sm text-slate-600">
                      {finding.masked_value}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">No masked secret findings yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Events</h2>
          <div className="mt-6 grid gap-3">
            {events?.length ? (
              events.map((event: any) => (
                <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(event.severity)}`}
                  >
                    {event.severity}
                  </span>
                  <p className="mt-3 font-black">{event.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {event.details}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No events yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
