import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createWorkspaceFromScanAction } from "@/app/reviews/actions";
import { createClient } from "@/lib/supabase/server";

export default async function ReportSecurityReviewWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    redirect("/login?message=Please login to create security review workspace");

  const { data: scan } = await supabase
    .from("scans")
    .select("id, website_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!scan) redirect("/dashboard?message=Scan not found");

  const { data: existing } = await supabase
    .from("security_review_workspaces")
    .select("id, title, status, progress_percent, total_items, overall_risk")
    .eq("scan_id", scan.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-16">
        {message ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
            {message}
          </div>
        ) : null}

        <Link
          href={`/report/${scan.id}`}
          className="text-sm font-bold text-slate-600"
        >
          Back to report
        </Link>

        <div className="mt-8 rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <p className="text-sm font-black text-blue-700">
            Security Review Workspace
          </p>
          <h1 className="mt-2 text-4xl font-black text-blue-950">
            Create client review workspace
          </h1>
          <p className="mt-4 break-all leading-8 text-blue-900">
            {scan.website_url}
          </p>
          <p className="mt-4 leading-8 text-blue-900">
            This converts a scan/report into a professional client workflow: bug
            lifecycle, developer fixes, retest proof and client-ready status
            tracking.
          </p>
        </div>

        {existing ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Workspace already exists</h2>
            <p className="mt-3 text-slate-600">
              {existing.title} · {existing.status} · {existing.progress_percent}
              % · {existing.overall_risk}
            </p>
            <Link
              href={`/reviews/${existing.id}`}
              className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              Open workspace
            </Link>
          </div>
        ) : (
          <form
            action={createWorkspaceFromScanAction}
            className="mt-8 rounded-3xl border border-slate-200 bg-white p-8"
          >
            <input type="hidden" name="scanId" value={scan.id} />
            <h2 className="text-2xl font-black">Workspace setup</h2>

            <div className="mt-5 grid gap-4">
              <input
                name="clientName"
                placeholder="Client name"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />

              <select
                name="reviewType"
                defaultValue="advanced-security-review"
                className="rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              >
                <option value="website-security-review">
                  Website Security Review
                </option>
                <option value="advanced-security-review">
                  Advanced Security Review
                </option>
                <option value="customer-data-safety-review">
                  Customer Data Safety Review
                </option>
                <option value="ecommerce-security-review">
                  Ecommerce Security Review
                </option>
                <option value="school-clinic-data-review">
                  School/Clinic Data Review
                </option>
                <option value="managed-monitoring-review">
                  Managed Monitoring Review
                </option>
              </select>
            </div>

            <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              Create security review workspace
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
