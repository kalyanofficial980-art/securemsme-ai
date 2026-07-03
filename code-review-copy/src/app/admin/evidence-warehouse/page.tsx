import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function statusClass(status: string) {
  if (status === "validated" || status === "active")
    return "bg-emerald-100 text-emerald-950";
  if (status === "needs-review" || status === "unvalidated")
    return "bg-amber-100 text-amber-950";
  if (status === "rejected" || status === "revoked")
    return "bg-red-100 text-red-950";
  return "bg-slate-100 text-slate-700";
}

export default async function AdminEvidenceWarehousePage() {
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

  const { data: chains } = await supabase
    .from("security_proof_chains")
    .select(
      "id, chain_name, chain_status, total_evidence_items, validated_items, needs_review_items, completeness_score, latest_hash, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  const { data: items } = await supabase
    .from("security_evidence_items")
    .select(
      "id, title, source_type, evidence_type, validation_status, evidence_quality, sensitivity_level, evidence_hash, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Evidence Warehouse Admin</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor proof chains, validation status, evidence quality and
          client-safe proof readiness.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent proof chains</h2>
          <div className="mt-6 grid gap-4">
            {chains?.length ? (
              chains.map((chain: any) => (
                <div
                  key={chain.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <h3 className="font-black">{chain.chain_name}</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {chain.total_evidence_items} items ·{" "}
                        {chain.validated_items} validated ·{" "}
                        {chain.needs_review_items} need review ·{" "}
                        {chain.completeness_score}% complete
                      </p>
                      <p className="mt-2 break-all text-xs font-bold text-slate-500">
                        latest{" "}
                        {chain.latest_hash
                          ? `${chain.latest_hash.slice(0, 16)}...`
                          : "none"}
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(chain.chain_status)}`}
                    >
                      {chain.chain_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No proof chains yet.</p>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Recent evidence items</h2>
          <div className="mt-6 grid gap-4">
            {items?.length ? (
              items.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        {item.source_type} · {item.evidence_type} ·{" "}
                        {item.sensitivity_level}
                      </p>
                      <h3 className="mt-1 font-black">{item.title}</h3>
                      <p className="mt-2 break-all text-xs font-bold text-slate-500">
                        {item.evidence_hash.slice(0, 18)}...
                      </p>
                    </div>
                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(item.validation_status)}`}
                    >
                      {item.validation_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No evidence items yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
