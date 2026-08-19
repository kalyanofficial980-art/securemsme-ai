import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { requireAdmin } from "@/lib/admin";
import { setUserPlanAction } from "./actions";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : "—";
}

export default async function AdminPlanControlPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, full_name, plan, plan_expires_at, role, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = users ?? [];

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/admin" className="text-sm font-semibold text-blue-700">← Admin</Link>
        <div className="mt-6 border-b border-slate-300 pb-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Entitlement operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Plan control</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Manage Free, Starter, Growth and Agency access with explicit expiry dates. Changes are written to the admin audit log.</p>
        </div>
        {message ? <div className="mt-6 border-l-2 border-blue-700 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-950">{message}</div> : null}

        <div className="mt-8 overflow-x-auto border border-slate-300 bg-white">
          <table className="min-w-[1080px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Expiry</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Update</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((user) => (
                <tr key={user.id} className="align-top">
                  <td className="px-5 py-5"><p className="font-semibold">{user.full_name || "User"}</p><p className="mt-1 text-xs text-slate-500">{user.email || user.id}</p></td>
                  <td className="px-5 py-5 capitalize">{user.plan}</td>
                  <td className="px-5 py-5">{formatDate(user.plan_expires_at)}</td>
                  <td className="px-5 py-5 capitalize">{user.role}</td>
                  <td className="px-5 py-4">
                    <form action={setUserPlanAction} className="grid grid-cols-[120px_190px_1fr_auto] gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <select name="plan" defaultValue={user.plan} className="border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"><option value="free">Free</option><option value="starter">Starter</option><option value="growth">Growth</option><option value="agency">Agency</option></select>
                      <input name="expiresAt" type="datetime-local" className="border border-slate-300 px-3 py-2 text-sm" />
                      <input name="reason" placeholder="Reason" className="border border-slate-300 px-3 py-2 text-sm" />
                      <button className="bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Apply</button>
                    </form>
                    <p className="mt-2 text-xs text-slate-400">Free ignores expiry; paid plans require a future expiry.</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
