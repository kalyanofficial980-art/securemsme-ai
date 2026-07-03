import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertsPanel } from "@/components/AlertsPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AlertsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to view alerts");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_id, website_url")
    .eq("id", id);
  if (profile?.role !== "admin") scanQuery = scanQuery.eq("user_id", user.id);

  const { data: scan } = await scanQuery.single();
  if (!scan) redirect("/dashboard?message=Alerts report not found");

  const { data: preferences } = scan.website_id
    ? await supabase
        .from("alert_preferences")
        .select(
          "id, status, in_app_enabled, email_enabled, recipient_email, min_severity, alert_types, created_at",
        )
        .eq("user_id", scan.user_id)
        .eq("website_id", scan.website_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : await supabase
        .from("alert_preferences")
        .select(
          "id, status, in_app_enabled, email_enabled, recipient_email, min_severity, alert_types, created_at",
        )
        .eq("user_id", scan.user_id)
        .eq("website_url", scan.website_url)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  const { data: notifications } = await supabase
    .from("security_alert_notifications")
    .select(
      "id, channel, recipient, alert_type, severity, title, message, status, delivery_mode, action_url, created_at",
    )
    .eq("user_id", scan.user_id)
    .eq("source_scan_id", scan.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notificationIds = (notifications || []).map((item) => item.id);
  const { data: attempts } = notificationIds.length
    ? await supabase
        .from("security_alert_delivery_attempts")
        .select("id, channel, provider, attempt_number, status, created_at")
        .in("notification_id", notificationIds)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const { count: monitoringEventCount } = scan.website_id
    ? await supabase
        .from("monitoring_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", scan.user_id)
        .eq("website_id", scan.website_id)
    : await supabase
        .from("monitoring_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", scan.user_id);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}/monitoring`}
              className="text-sm font-bold text-slate-600"
            >
              Back to monitoring
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Alerts + Email Notifications
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              In-app alerts and email-ready notification queue.
            </p>
          </div>
          <Link
            href="/alerts-notifications"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Alerts info
          </Link>
        </div>

        <AlertsPanel
          scanId={scan.id}
          websiteUrl={scan.website_url}
          preferences={preferences}
          notifications={notifications || []}
          attempts={attempts || []}
          monitoringEventCount={monitoringEventCount || 0}
          message={message}
        />
      </section>
    </main>
  );
}
