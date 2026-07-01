import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ReportCard } from "@/components/ReportCard";
import { createClient } from "@/lib/supabase/server";
import type { ScanReportRecord } from "@/lib/report-types";

type ReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view report");
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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <Link href="/dashboard" className="text-sm font-bold text-slate-600">
          Back to dashboard
        </Link>

        <div className="mt-6">
          <ReportCard scan={scan as ScanReportRecord} />
        </div>
      </section>
    </main>
  );
}
