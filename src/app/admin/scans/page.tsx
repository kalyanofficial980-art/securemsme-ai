import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { requireAdmin } from "@/lib/admin";

export default async function AdminScansPage() {
  const { supabase } = await requireAdmin();

  const { data: scans } = await supabase
    .from("admin_customer_scans_v1")
    .select(
      "id, user_id, website_id, website_url, score, risk_level, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/admin" className="text-sm font-semibold text-blue-700">← Admin</Link>

        <div className="mt-6 flex flex-col justify-between gap-4 border-b border-slate-300 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Review operations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Scans</h1>
            <p className="mt-2 text-sm text-slate-600">Inspect customer security reviews, scores, risk levels and report records. Admin-owned legacy scans are excluded.</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{scans?.length ?? 0} loaded</span>
        </div>

        <div className="mt-8 overflow-x-auto border border-slate-300 bg-white">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Website</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Risk</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {scans?.length ? scans.map((scan) => (
                <tr key={scan.id} className="align-top hover:bg-slate-50/70">
                  <td className="max-w-md break-all px-5 py-4 font-semibold text-slate-950">
                    {scan.website_url}
                    <p className="mt-1 break-all font-mono text-[11px] font-normal text-slate-400">User {scan.user_id}</p>
                  </td>
                  <td className="px-5 py-4"><span className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold">{scan.score}/100</span></td>
                  <td className="px-5 py-4"><RiskBadge riskLevel={scan.risk_level} /></td>
                  <td className="px-5 py-4 text-slate-600">{new Date(scan.created_at).toLocaleString()}</td>
                  <td className="px-5 py-4"><Link href={`/report/${scan.id}`} className="font-semibold text-blue-700">Open →</Link></td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">No customer scans yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
