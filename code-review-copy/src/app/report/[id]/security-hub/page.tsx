import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerReportHub } from "@/components/CustomerReportHub";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export default async function SecurityHubPage({
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
    redirect("/login?message=Please login to view security report");
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
    redirect("/dashboard?message=Security report not found");
  }

  const report = asRecord(scan.report);
  const topFixes = asArray(report.topFixes).map((item) => asRecord(item));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8">
          <Link
            href={`/report/${scan.id}`}
            className="text-sm font-bold text-slate-600"
          >
            Back to full report
          </Link>
        </div>

        <CustomerReportHub
          scanId={scan.id}
          websiteUrl={scan.website_url}
          score={scan.score}
          riskLevel={scan.risk_level}
          createdAt={scan.created_at}
          topFixes={topFixes}
        />
      </section>
    </main>
  );
}
