import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { requireAdmin } from "@/lib/admin";

export default async function AdminUsersPage() {
  const { supabase } = await requireAdmin();

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, plan, role, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Link href="/admin" className="text-sm font-bold text-slate-600">
          Back to admin
        </Link>

        <h1 className="mt-6 text-4xl font-black">Users</h1>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">User ID</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-black">
                    {user.full_name || "User"}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {user.plan || "free"}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {user.role || "user"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleString()
                      : "--"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {user.id}
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
