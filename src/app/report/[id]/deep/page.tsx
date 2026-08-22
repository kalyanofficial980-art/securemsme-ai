import Link from "next/link";
import { redirect } from "next/navigation";
import { DeepScanV1Panel } from "@/components/DeepScanV1Panel";
import { Navbar } from "@/components/Navbar";
import type { DeepScanV1Report } from "@/lib/deep-scan-v1";
import { createClient } from "@/lib/supabase/server";

export default async function DeepReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to view deep report");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_url, report, created_at")
    .eq("id", id);
  if (profile?.role !== "admin") scanQuery = scanQuery.eq("user_id", user.id);

  const { data: scan } = await scanQuery.single();
  if (!scan) redirect("/dashboard?message=Report not found");

  const report = scan.report && typeof scan.report === "object"
    ? (scan.report as Record<string, unknown>)
    : {};
  const deepScanV1 = report.deepScanV1 && typeof report.deepScanV1 === "object"
    ? (report.deepScanV1 as DeepScanV1Report)
    : null;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-300 pb-6 sm:flex-row sm:items-end">
          <div>
            <Link href={`/report/${scan.id}`} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
              ← Security report
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">Authorized deep report</p>
            <h1 className="mt-2 break-all text-3xl font-semibold tracking-[-0.03em]">{scan.website_url}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Deep evidence is shown separately from the canonical Security Score so inventory signals, partial OWASP coverage and uncertain areas are not misrepresented as confirmed vulnerabilities.
            </p>
          </div>
          <p className="text-xs text-slate-500">Scanned {new Date(scan.created_at).toLocaleString()}</p>
        </div>

        {deepScanV1 ? (
          <DeepScanV1Panel report={deepScanV1} />
        ) : (
          <section className="mt-8 border border-slate-300 bg-white p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">No Deep Scan V1 evidence</p>
            <h2 className="mt-2 text-2xl font-semibold">This scan is a Normal/legacy report.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Run an authorized Deep Scan from the verified website workspace. Deep Scan V1 requires verified ownership and an active Growth or Agency plan for customers.
            </p>
            <Link href="/websites" className="mt-6 inline-flex rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
              Open website workspaces →
            </Link>
          </section>
        )}
      </section>
    </main>
  );
}
