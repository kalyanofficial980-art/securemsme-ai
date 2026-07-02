import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { CustomerOnboardingPanel } from "@/components/CustomerOnboardingPanel";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to continue onboarding");

  const { data: profile } = await supabase
    .from("customer_onboarding_profiles_v2")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: steps } = await supabase
    .from("customer_onboarding_steps_v2")
    .select("*")
    .eq("user_id", user.id)
    .order("step_order", { ascending: true })
    .limit(20);

  const { data: recommendation } = await supabase
    .from("customer_plan_recommendations_v2")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: funnels } = await supabase
    .from("customer_first_scan_funnels_v2")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <CustomerOnboardingPanel
          profile={profile}
          steps={steps || []}
          recommendation={recommendation}
          funnels={funnels || []}
          message={message}
          mode="success"
        />
      </section>
    </main>
  );
}
