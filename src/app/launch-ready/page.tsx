import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { LaunchReadyPanel } from "@/components/LaunchReadyPanel";
import { createClient } from "@/lib/supabase/server";

export default async function LaunchReadyPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to continue launch setup");

  const { data: legalAcceptance } = await supabase
    .from("user_legal_acceptances_v2")
    .select("accepted_at, acceptance_status")
    .eq("user_id", user.id)
    .eq("acceptance_status", "accepted")
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: payments } = await supabase
    .from("manual_payment_requests_v2")
    .select("id, requested_plan_name, amount_inr, request_status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: authorizations } = await supabase
    .from("website_scan_authorizations_v2")
    .select("id, target_url, authorization_status, confirmed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <LaunchReadyPanel
          legalAcceptance={legalAcceptance}
          payments={payments || []}
          authorizations={authorizations || []}
          message={message}
        />
      </section>
    </main>
  );
}
