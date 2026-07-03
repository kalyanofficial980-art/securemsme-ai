import Link from "next/link";
import { redirect } from "next/navigation";
import { EvidenceCalibrationPanel } from "@/components/EvidenceCalibrationPanel";
import { Navbar } from "@/components/Navbar";
import { buildEvidenceCalibrationReport } from "@/lib/evidence-calibration";
import { createClient } from "@/lib/supabase/server";

export default async function EvidenceCalibrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view evidence calibration");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_url, score, risk_level, report, created_at")
    .eq("id", id);

  if (profile?.role !== "admin") {
    scanQuery = scanQuery.eq("user_id", user.id);
  }

  const { data: scan } = await scanQuery.single();

  if (!scan) {
    redirect("/dashboard?message=Evidence calibration not found");
  }

  const report = (scan.report || {}) as Record<string, unknown>;
  const calibration =
    (report.evidenceCalibration as
      ReturnType<typeof buildEvidenceCalibrationReport> | undefined) ||
    buildEvidenceCalibrationReport(report);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}`}
              className="text-sm font-bold text-slate-600"
            >
              Back to normal report
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Evidence calibration
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              Scan date: {new Date(scan.created_at).toLocaleString()}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/report/${scan.id}/vulnerability-intelligence`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Vulnerability intelligence
            </Link>
            <Link
              href={`/report/${scan.id}/fix-roadmap`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Developer roadmap
            </Link>
          </div>
        </div>

        <EvidenceCalibrationPanel calibration={calibration} />
      </section>
    </main>
  );
}
