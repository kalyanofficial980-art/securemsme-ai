import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { getEffectivePlan } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";

function formatBillingDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please sign in to manage billing");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", user.id)
    .single();

  const effectivePlan = getEffectivePlan(profile);
  const isPaid = effectivePlan !== "free";

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="flex flex-col justify-between gap-6 border-b border-slate-300 pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              Billing & access
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em]">
              Plan management
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              VeyraSec is using assisted billing for the initial paid launch. Plan activation and renewal are reviewed before paid access is applied.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Compare plans
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Contact billing
            </Link>
          </div>
        </div>

        <div className="mt-8 grid border border-slate-300 bg-white md:grid-cols-3">
          <div className="border-b border-slate-200 p-6 md:border-b-0 md:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">
              Current plan
            </p>
            <p className="mt-3 text-3xl font-semibold capitalize">{effectivePlan}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isPaid ? "Paid plan access is active." : "Free evaluation limits currently apply."}
            </p>
          </div>

          <div className="border-b border-slate-200 p-6 md:border-b-0 md:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">
              Access through
            </p>
            <p className="mt-3 text-xl font-semibold">
              {isPaid ? formatBillingDate(profile?.plan_expires_at) : "Free plan"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Paid access is time-bounded and renewed only after billing review.
            </p>
          </div>

          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">
              Billing mode
            </p>
            <p className="mt-3 text-xl font-semibold">Assisted activation</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Automatic recurring collection is not required for the initial launch.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="border border-slate-300 bg-white">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold">How paid activation works</h2>
              <p className="mt-1 text-sm text-slate-500">
                A simple launch workflow without storing sensitive payment credentials in VeyraSec.
              </p>
            </div>

            <div className="divide-y divide-slate-200">
              {[
                ["01", "Choose a plan", "Select Starter, Growth or Agency from the pricing page."],
                ["02", "Receive approved payment instructions", "Use only the payment instructions provided through the official VeyraSec billing/support channel."],
                ["03", "Share the transaction reference", "Send only the UTR or transaction reference needed to verify payment. Never send OTPs, UPI PINs or banking passwords."],
                ["04", "Plan is activated", "After verification, the paid plan and its server-side limits are applied to your account."],
              ].map(([step, title, body]) => (
                <div key={step} className="grid gap-3 px-6 py-5 sm:grid-cols-[56px_170px_1fr]">
                  <span className="text-xs font-semibold tracking-[0.12em] text-slate-400">{step}</span>
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="text-sm leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="border border-slate-300 bg-slate-950 p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-300">
              Payment safety
            </p>
            <h2 className="mt-3 text-xl font-semibold">Never send payment secrets.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              VeyraSec support should never need your OTP, UPI PIN, card PIN, bank password, private key or session cookie.
            </p>
            <div className="mt-6 border-t border-slate-700 pt-5 text-sm leading-6 text-slate-300">
              Need a plan activation, renewal or refund review? Use the contact channel so the request stays traceable.
            </div>
            <Link
              href="/contact"
              className="mt-6 inline-flex text-sm font-semibold text-blue-300 hover:text-blue-200"
            >
              Open billing support →
            </Link>
          </aside>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-4 border-t border-slate-300 pt-6 text-sm text-slate-600 sm:flex-row sm:items-center">
          <p>Renewal is not automatic during the assisted-billing launch phase.</p>
          <div className="flex gap-5">
            <Link href="/legal/refund" className="font-semibold text-slate-800 hover:text-blue-700">
              Refund policy
            </Link>
            <Link href="/legal/terms" className="font-semibold text-slate-800 hover:text-blue-700">
              Terms
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
