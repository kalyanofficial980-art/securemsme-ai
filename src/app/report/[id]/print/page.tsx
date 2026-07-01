import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { ReportCard } from "@/components/ReportCard";
import { createClient } from "@/lib/supabase/server";
import type { ScanReportRecord } from "@/lib/report-types";

type PrintReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PrintReportPage({
  params,
}: PrintReportPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to print report");
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url, score, risk_level, report, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="mx-auto max-w-5xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        <div className="mb-8 flex flex-wrap gap-3 print:hidden">
          <Link
            href={`/report/${id}`}
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-center font-bold text-slate-950 hover:bg-slate-100"
          >
            Back to report
          </Link>

          <a
            href={`/api/report/${id}/pdf`}
            className="rounded-full bg-slate-950 px-5 py-3 text-center font-bold text-white hover:bg-slate-800"
          >
            Download PDF
          </a>

          <PrintButton />
        </div>

        <ReportCard
          scan={scan as ScanReportRecord}
          showActions={false}
          printMode
        />
      </section>
    </main>
  );
}
