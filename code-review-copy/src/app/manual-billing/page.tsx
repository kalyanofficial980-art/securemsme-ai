import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ManualBillingPanel } from "@/components/ManualBillingPanel";
import { createClient } from "@/lib/supabase/server";

export default async function ManualBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to open billing");

  const { data: payments } = await supabase
    .from("manual_payment_requests_v2")
    .select(
      "id, requested_plan_name, billing_cycle, amount_inr, payment_reference, request_status, admin_review_note, plan_activated_at, plan_expires_at, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <ManualBillingPanel payments={payments || []} message={message} />
      </section>
    </main>
  );
}
