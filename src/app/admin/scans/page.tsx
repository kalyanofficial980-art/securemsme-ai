import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { requireAdmin } from "@/lib/admin";

export default async function AdminScansPage() {
  const { supabase } = await requireAdmin();

  const { data: scans } = await supabase
    .from("scans")
    .select(
      "id, user_id, website_id, website_url, score, risk_level, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Link href="/admin" className="text-sm font-bold text-slate-600">
          Back to admin
        </Link>

        <h1 className="mt-6 text-4xl font-black">All scans</h1>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Report</th>
              </tr>
            </thead>
            <tbody>
              {scans?.map((scan) => (
                <tr key={scan.id} className="border-t border-slate-200">
                  <td className="max-w-md break-all px-4 py-3 font-black">
                    {scan.website_url}
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      User: {scan.user_id}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-black">{scan.score}</td>
                  <td className="px-4 py-3">
                    <RiskBadge riskLevel={scan.risk_level} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(scan.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/report/${scan.id}`}
                      className="font-black underline"
                    >
                      View
                    </Link>
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
