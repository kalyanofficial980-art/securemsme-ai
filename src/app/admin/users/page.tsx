import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { requireAdmin } from "@/lib/admin";

export default async function AdminUsersPage() {
  const { supabase } = await requireAdmin();

  const { data: users } = await supabase
    .from("admin_customer_profiles_v1")
    .select("id, full_name, plan, role, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/admin" className="text-sm font-semibold text-blue-700">← Admin</Link>

        <div className="mt-6 flex flex-col justify-between gap-4 border-b border-slate-300 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Customer operations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Users</h1>
            <p className="mt-2 text-sm text-slate-600">Review customer accounts and assigned plans. Administrative accounts are excluded.</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{users?.length ?? 0} loaded</span>
        </div>

        <div className="mt-8 overflow-x-auto border border-slate-300 bg-white">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">User ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users?.length ? users.map((user) => (
                <tr key={user.id} className="align-top hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-semibold text-slate-950">{user.full_name || "User"}</td>
                  <td className="px-5 py-4"><span className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold capitalize">{user.plan || "free"}</span></td>
                  <td className="px-5 py-4"><span className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold capitalize">{user.role || "user"}</span></td>
                  <td className="px-5 py-4 text-slate-600">{user.created_at ? new Date(user.created_at).toLocaleString() : "—"}</td>
                  <td className="max-w-xs break-all px-5 py-4 font-mono text-xs text-slate-500">{user.id}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">No customer accounts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
