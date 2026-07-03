import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { FinalLaunchOpsPanel } from "@/components/FinalLaunchOpsPanel";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLaunchOpsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
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

  const { data: checklist } = await supabase
    .from("launch_final_checklist_items_v2")
    .select("*")
    .order("category");
  const { data: betaCustomers } = await supabase
    .from("launch_beta_customers_v2")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  const { data: notifications } = await supabase
    .from("launch_email_notification_jobs_v2")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  const { data: events } = await supabase
    .from("launch_ops_events_v2")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <FinalLaunchOpsPanel
          checklist={checklist || []}
          betaCustomers={betaCustomers || []}
          notifications={notifications || []}
          events={events || []}
          message={message}
        />
      </section>
    </main>
  );
}
