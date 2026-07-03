import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { getDefaultTechnologyRiskRules } from "@/lib/cve-intelligence";
import { createClient } from "@/lib/supabase/server";

export default async function AdminKnownRisksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login as admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard?message=Admin access required");
  }

  const { data: savedRules } = await supabase
    .from("technology_risk_rules")
    .select(
      "slug, technology_name, technology_family, risk_category, default_severity, is_active",
    )
    .order("technology_name", { ascending: true });

  const defaultRules = getDefaultTechnologyRiskRules();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          Known technology risk database
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Internal foundation for technology-to-risk rules. Customer reports use
          safe language and do not claim CVE certainty without exact versions.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-bold text-slate-500">Default rules</p>
            <p className="mt-2 text-4xl font-black">{defaultRules.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-bold text-slate-500">DB rules</p>
            <p className="mt-2 text-4xl font-black">
              {savedRules?.length || 0}
            </p>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm font-bold text-amber-700">Rule</p>
            <p className="mt-2 font-black text-amber-950">
              No version = no CVE certainty
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Database rules</h2>
          <div className="mt-6 grid gap-4">
            {(savedRules && savedRules.length ? savedRules : defaultRules).map(
              (rule: any) => (
                <div
                  key={rule.slug}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="font-black">
                    {rule.technology_name || rule.technologyName}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {rule.technology_family || rule.technologyFamily} ·{" "}
                    {rule.risk_category || rule.riskCategory} ·{" "}
                    {rule.default_severity || rule.defaultSeverity}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
