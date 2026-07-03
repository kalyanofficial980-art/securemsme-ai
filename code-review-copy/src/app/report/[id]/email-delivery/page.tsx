import Link from "next/link";
import { redirect } from "next/navigation";
import { EmailProviderPanel } from "@/components/EmailProviderPanel";
import { Navbar } from "@/components/Navbar";
import { getEmailEnvStatus } from "@/lib/email-provider";
import { createClient } from "@/lib/supabase/server";

export default async function EmailDeliveryPage({
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

  if (!user) redirect("/login?message=Please login to view email delivery");

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
  if (!scan) redirect("/dashboard?message=Email delivery report not found");

  const { data: settings } = await supabase
    .from("email_provider_settings")
    .select("*")
    .eq("user_id", scan.user_id)
    .maybeSingle();

  const { data: deliveryRuns } = await supabase
    .from("email_provider_delivery_runs")
    .select(
      "id, provider, delivery_type, recipient_email, subject, status, provider_message_id, error_message, sent_at, created_at",
    )
    .eq("user_id", scan.user_id)
    .eq("source_scan_id", scan.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: events } = await supabase
    .from("email_provider_events")
    .select("id, event_type, severity, title, details, created_at")
    .eq("user_id", scan.user_id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}/alerts`}
              className="text-sm font-bold text-slate-600"
            >
              Back to alerts
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Real Email Provider
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              Send alert notifications through Resend when provider env is
              configured.
            </p>
          </div>

          <Link
            href="/email-provider-integration"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
          >
            Provider info
          </Link>
        </div>

        <EmailProviderPanel
          scanId={scan.id}
          websiteUrl={scan.website_url}
          userEmail={user.email || ""}
          settings={settings}
          deliveryRuns={deliveryRuns || []}
          events={events || []}
          envStatus={getEmailEnvStatus()}
          message={message}
        />
      </section>
    </main>
  );
}
