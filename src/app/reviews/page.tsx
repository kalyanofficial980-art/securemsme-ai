import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createManualWorkspaceAction } from "@/app/reviews/actions";
import { createClient } from "@/lib/supabase/server";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login to view security reviews");

  const { data: workspaces } = await supabase
    .from("security_review_workspaces")
    .select(
      "id, title, client_name, target_url, review_type, status, priority, review_stage, overall_risk, progress_percent, total_items, open_items, verified_fixed_items, updated_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        {message ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-900">
            {message}
          </div>
        ) : null}

        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <p className="text-sm font-black text-blue-700">
            Client security operations
          </p>
          <h1 className="mt-2 text-4xl font-black text-blue-950">
            Security Review Workspaces
          </h1>
          <p className="mt-4 max-w-3xl leading-8 text-blue-900">
            Manage every client review like a professional cybersecurity
            service: scope, scanner findings, bug lifecycle, developer fixes,
            retest proof and client-ready summaries.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Active workspaces</h2>

            <div className="mt-6 grid gap-4">
              {workspaces?.length ? (
                workspaces.map((workspace: any) => (
                  <Link
                    key={workspace.id}
                    href={`/reviews/${workspace.id}`}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-6 hover:bg-slate-100"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-500">
                          {workspace.review_type} · {workspace.status} ·{" "}
                          {workspace.priority}
                        </p>
                        <h3 className="mt-2 text-xl font-black">
                          {workspace.title}
                        </h3>
                        <p className="mt-2 break-all text-sm font-bold text-slate-600">
                          {workspace.target_url}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          Client: {workspace.client_name || "Not added"} ·
                          Stage: {workspace.review_stage}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-4 text-right">
                        <p className="text-3xl font-black">
                          {workspace.progress_percent}%
                        </p>
                        <p className="text-xs font-bold text-slate-500">
                          {workspace.overall_risk}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-white p-3 text-sm font-bold">
                        Total: {workspace.total_items}
                      </div>
                      <div className="rounded-2xl bg-white p-3 text-sm font-bold">
                        Open: {workspace.open_items}
                      </div>
                      <div className="rounded-2xl bg-white p-3 text-sm font-bold">
                        Verified: {workspace.verified_fixed_items}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-600">
                  No workspaces yet. Create one manually or open a scan report
                  and create from scan.
                </p>
              )}
            </div>
          </div>

          <form
            action={createManualWorkspaceAction}
            className="rounded-3xl border border-slate-200 bg-white p-8"
          >
            <h2 className="text-2xl font-black">Create manual workspace</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Use this for client reviews before scanner is connected.
            </p>

            <div className="mt-5 grid gap-3">
              <input
                name="clientName"
                placeholder="Client name"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <input
                name="clientEmail"
                placeholder="Client email"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />
              <input
                name="targetUrl"
                required
                placeholder="https://clientwebsite.com"
                className="rounded-2xl border border-slate-300 px-4 py-3"
              />

              <select
                name="businessType"
                defaultValue="general-business"
                className="rounded-2xl border border-slate-300 px-4 py-3 font-bold"
              >
                <option value="general-business">General business</option>
                <option value="school-college">School / College</option>
                <option value="clinic-healthcare">Clinic / Healthcare</option>
                <option value="coaching-centre">Coaching Centre</option>
                <option value="ecommerce">Ecommerce</option>
                <option value="customer-data-website">
                  Customer Data Website
                </option>
              </select>

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

            <button className="mt-5 w-full rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              Create workspace
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
