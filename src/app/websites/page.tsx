import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { createClient } from "@/lib/supabase/server";

export default async function WebsitesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view websites");
  }

  const { data: websites } = await supabase
    .from("websites")
    .select("id, name, url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: scans } = await supabase
    .from("scans")
    .select("id, website_id, score, risk_level, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const latestScanByWebsite = new Map<
    string,
    NonNullable<typeof scans>[number]
  >();

  for (const scan of scans ?? []) {
    if (scan.website_id && !latestScanByWebsite.has(scan.website_id)) {
      latestScanByWebsite.set(scan.website_id, scan);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-bold text-slate-500">
              Multi-website monitoring
            </p>
            <h1 className="mt-2 text-4xl font-black">Saved websites</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Add multiple business websites and track scan history separately.
            </p>
          </div>

          <Link
            href="/websites/new"
            className="rounded-full bg-slate-950 px-5 py-3 text-center font-bold text-white hover:bg-slate-800"
          >
            Add website
          </Link>
        </div>

        {websites?.length ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {websites.map((website) => {
              const latestScan = latestScanByWebsite.get(website.id);

              return (
                <div
                  key={website.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <h2 className="text-xl font-black">
                        {website.name || "Website"}
                      </h2>
                      <p className="mt-2 break-all text-sm text-slate-600">
                        {website.url}
                      </p>
                    </div>

                    {latestScan ? (
                      <RiskBadge riskLevel={latestScan.risk_level} />
                    ) : (
                      <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                        Not scanned
                      </span>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Latest score</p>
                      <p className="mt-2 text-3xl font-black">
                        {latestScan?.score ?? "--"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Last scan</p>
                      <p className="mt-2 text-sm font-black">
                        {latestScan
                          ? new Date(latestScan.created_at).toLocaleDateString()
                          : "Never"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/websites/${website.id}`}
                      className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      Open
                    </Link>

                    <Link
                      href={`/scan?websiteId=${website.id}`}
                      className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100"
                    >
                      Scan
                    </Link>

                    {latestScan ? (
                      <Link
                        href={`/report/${latestScan.id}`}
                        className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100"
                      >
                        Latest report
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-2xl font-black">No websites saved yet</h2>
            <p className="mt-3 text-slate-600">
              Add your first website to start tracking security history.
            </p>
            <Link
              href="/websites/new"
              className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 font-bold text-white"
            >
              Add first website
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
