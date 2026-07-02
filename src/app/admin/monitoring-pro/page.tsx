import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function badgeClass(value: string) {
  if (["active", "completed", "Info", "Low"].includes(value))
    return "bg-emerald-100 text-emerald-950";
  if (["open", "Medium", "needs-review"].includes(value))
    return "bg-amber-100 text-amber-950";
  if (["Critical", "High", "failed"].includes(value))
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminMonitoringProPage() {
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

  const { data: targets } = await supabase
    .from("monitoring_pro_targets_v2")
    .select(
      "id, target_url, monitoring_status, last_health_score, last_regression_score, last_risk_score, open_alert_count, regression_count, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: alerts } = await supabase
    .from("monitoring_regression_alerts_v2")
    .select(
      "id, alert_title, alert_status, alert_type, severity, affected_area, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Monitoring Pro Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor passive-safe targets, regression alerts and agency monitoring
          events.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Monitoring targets</h2>
          <div className="mt-6 grid gap-4">
            {targets?.length ? (
              targets.map((target: any) => (
                <div
                  key={target.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">
                        {target.target_url}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        health {target.last_health_score}/100 · regression{" "}
                        {target.last_regression_score}/100 · risk{" "}
                        {target.last_risk_score}/100
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        alerts {target.open_alert_count} · regressions{" "}
                        {target.regression_count}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(target.monitoring_status)}`}
                    >
                      {target.monitoring_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No monitoring targets yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Regression alerts</h2>
          <div className="mt-6 grid gap-4">
            {alerts?.length ? (
              alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-black">{alert.alert_title}</p>
                      <p className="mt-2 break-all text-sm text-slate-600">
                        {alert.affected_area}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {alert.alert_type} · {alert.alert_status}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${badgeClass(alert.severity)}`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No monitoring alerts yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
