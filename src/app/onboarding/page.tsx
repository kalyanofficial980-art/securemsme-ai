import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { getEffectivePlan } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";

function paymentStatusLabel(value?: string | null) {
  if (!value) return "Not started";
  if (value === "submitted_for_review") return "Waiting for admin review";
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return value.replaceAll("_", " ");
}

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to get started");

  const [{ data: profile }, { count: websiteCount }, { count: scanCount }, { data: payment }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, plan, plan_expires_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("websites")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("scans")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("manual_payment_requests_v2")
        .select("requested_plan_name, request_status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const plan = getEffectivePlan(profile);
  const hasWebsite = (websiteCount ?? 0) > 0;
  const hasScan = (scanCount ?? 0) > 0;
  const hasPaidPlan = plan !== "free";

  const steps = [
    {
      number: "01",
      title: "Add your website",
      body: "Save a public website you own, manage, or are authorized to review.",
      done: hasWebsite,
      href: hasWebsite ? "/websites" : "/websites/new",
      action: hasWebsite ? "Open websites" : "Add website",
    },
    {
      number: "02",
      title: "Run the first safe scan",
      body: "Create a real baseline report using the production scanner.",
      done: hasScan,
      href: "/scan",
      action: hasScan ? "Run another scan" : "Run first scan",
    },
    {
      number: "03",
      title: "Activate a paid plan when ready",
      body: "Starter, Growth and Agency are monthly assisted activations. Payment never activates access until admin review.",
      done: hasPaidPlan,
      href: "/manual-billing",
      action: hasPaidPlan ? "Manage billing" : "Choose paid plan",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="border-b border-slate-300 pb-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Get started</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">Three steps to your first real security review</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            No separate onboarding database or duplicate wizard is required. Your website, scan history and billing state are the source of truth.
          </p>
        </div>

        <div className="mt-8 grid border border-slate-300 bg-white sm:grid-cols-3">
          <div className="border-b border-slate-200 p-5 sm:border-b-0 sm:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Account</p>
            <p className="mt-2 font-semibold">{profile?.full_name || user.email || "Customer"}</p>
          </div>
          <div className="border-b border-slate-200 p-5 sm:border-b-0 sm:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Current plan</p>
            <p className="mt-2 font-semibold capitalize">{plan}</p>
          </div>
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Latest payment request</p>
            <p className="mt-2 font-semibold">{paymentStatusLabel(payment?.request_status)}</p>
            {payment?.requested_plan_name ? <p className="mt-1 text-xs text-slate-500">{payment.requested_plan_name}</p> : null}
          </div>
        </div>

        <div className="mt-8 divide-y divide-slate-200 border border-slate-300 bg-white">
          {steps.map((step) => (
            <div key={step.number} className="grid gap-4 p-6 md:grid-cols-[70px_1fr_auto] md:items-center">
              <span className="font-mono text-xs text-slate-400">{step.number}</span>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold">{step.title}</h2>
                  <span className={`border px-2.5 py-1 text-xs font-semibold ${step.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                    {step.done ? "Done" : "Next"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
              </div>
              <Link href={step.href} className="inline-flex justify-center bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
                {step.action}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 border border-slate-300 bg-white p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold">Already know what you need?</p>
            <p className="mt-1 text-sm text-slate-500">Go directly to your workspace. You can return here any time.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-semibold text-blue-700">Open dashboard →</Link>
        </div>
      </section>
    </main>
  );
}
