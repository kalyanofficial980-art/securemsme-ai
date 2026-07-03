import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminApiSecurityPage() {
  const supabase = await createClient();
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

  const { data: inventories } = await supabase
    .from("api_security_inventories")
    .select(
      "id, target_url, scanner_status, document_count, endpoint_count, get_endpoint_count, mutation_method_count, auth_unknown_count, sensitive_path_count, api_risk_signal_count, blocked_execution_count, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">API security observability</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor API documentation discovery, endpoint inventory, auth unknown
          counts, mutation methods, sensitive paths and risk signals.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest API inventories</h2>
          <div className="mt-6 grid gap-4">
            {inventories?.length ? (
              inventories.map((inventory) => (
                <div
                  key={inventory.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">
                        {inventory.target_url}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(inventory.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900">
                      {inventory.scanner_status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Docs</p>
                      <p className="text-2xl font-black">
                        {inventory.document_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Endpoints</p>
                      <p className="text-2xl font-black">
                        {inventory.endpoint_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Mutations</p>
                      <p className="text-2xl font-black">
                        {inventory.mutation_method_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Auth unknown</p>
                      <p className="text-2xl font-black">
                        {inventory.auth_unknown_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Signals</p>
                      <p className="text-2xl font-black">
                        {inventory.api_risk_signal_count}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No API security inventories yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
