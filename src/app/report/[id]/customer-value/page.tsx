import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerValuePanel } from "@/components/CustomerValuePanel";
import {
  buildCustomerValueReport,
  extractFixTasksFromReport,
  mapDatabaseFixItem,
} from "@/lib/customer-value";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerValuePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view customer value report");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select(
      "id, user_id, website_id, website_url, score, risk_level, report, created_at",
    )
    .eq("id", id);

  if (profile?.role !== "admin") {
    scanQuery = scanQuery.eq("user_id", user.id);
  }

  const { data: scan } = await scanQuery.single();

  if (!scan) {
    redirect("/dashboard?message=Customer value report not found");
  }

  let previousScan = null;

  if (scan.website_id) {
    const { data } = await supabase
      .from("scans")
      .select(
        "id, website_id, website_url, score, risk_level, report, created_at",
      )
      .eq("website_id", scan.website_id)
      .eq("user_id", scan.user_id)
      .lt("created_at", scan.created_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    previousScan = data;
  }

  let fixItemsQuery = supabase
    .from("fix_items")
    .select("*")
    .eq("user_id", scan.user_id)
    .order("created_at", { ascending: true });

  if (scan.website_id) {
    fixItemsQuery = fixItemsQuery.eq("website_id", scan.website_id);
  } else {
    fixItemsQuery = fixItemsQuery.eq("scan_id", scan.id);
  }

  const { data: savedFixItems } = await fixItemsQuery;

  const fallbackTasks = extractFixTasksFromReport({
    report: (scan.report || {}) as Record<string, unknown>,
    userId: scan.user_id,
    websiteId: scan.website_id || null,
    scanId: scan.id,
  });

  const tasks =
    savedFixItems && savedFixItems.length
      ? savedFixItems.map((row) => mapDatabaseFixItem(row))
      : fallbackTasks;

  const customerValueReport = buildCustomerValueReport({
    currentScan: scan,
    previousScan,
    tasks,
  });

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
              Customer value and proof-of-fix
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">
              {scan.website_url}
            </h1>
            <p className="mt-3 text-slate-600">
              Convert the security report into customer actions, developer
              tasks, and before/after proof.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/report/${scan.id}/evidence-calibration`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Evidence calibration
            </Link>
            <Link
              href={`/report/${scan.id}/fix-roadmap`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Developer roadmap
            </Link>
          </div>
        </div>

        <CustomerValuePanel
          scanId={scan.id}
          report={customerValueReport}
          hasSavedWorkflow={Boolean(savedFixItems?.length)}
          message={message}
        />
      </section>
    </main>
  );
}
