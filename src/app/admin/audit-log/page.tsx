import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { requireAdmin } from "@/lib/admin";

export default async function AdminAuditLogPage() {
  const { supabase } = await requireAdmin();
  const { data: events } = await supabase
    .from("admin_operations_audit_v2")
    .select("id, admin_user_id, target_user_id, action_type, entity_type, entity_id, summary, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = events ?? [];

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/admin" className="text-sm font-semibold text-blue-700">← Admin</Link>
        <div className="mt-6 border-b border-slate-300 pb-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Administrative evidence</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Audit log</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Trace paid entitlement changes and support operations performed through protected admin workflows.</p>
        </div>

        <section className="mt-8 border border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-6 py-4"><h2 className="text-lg font-semibold">Recent admin actions</h2></div>
          {rows.length ? (
            <div className="divide-y divide-slate-200">
              {rows.map((event) => (
                <div key={event.id} className="grid gap-4 px-6 py-5 lg:grid-cols-[190px_1fr_220px] lg:items-start">
                  <div><p className="text-sm font-semibold capitalize">{event.action_type.replaceAll("-", " ")}</p><p className="mt-1 text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</p></div>
                  <div><p className="text-sm text-slate-800">{event.summary}</p><p className="mt-1 break-all text-xs text-slate-400">{event.entity_type} · {event.entity_id || "—"}</p></div>
                  <div className="text-xs text-slate-500"><p className="break-all">Admin: {event.admin_user_id}</p>{event.target_user_id ? <p className="mt-1 break-all">Target: {event.target_user_id}</p> : null}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-sm text-slate-500">No admin audit events yet.</div>
          )}
        </section>
      </section>
    </main>
  );
}
