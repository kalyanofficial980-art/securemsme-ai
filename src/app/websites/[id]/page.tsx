import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { RiskBadge } from "@/components/RiskBadge";
import { deleteWebsite } from "@/app/websites/actions";
import { createClient } from "@/lib/supabase/server";

type WebsiteDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function WebsiteDetailPage({
  params,
}: WebsiteDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to view website");
  }

  const { data: website } = await supabase
    .from("websites")
    .select("id, name, url, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!website) {
    notFound();
  }

  const { data: scans } = await supabase
    .from("scans")
    .select("id, score, risk_level, created_at, website_url")
    .eq("user_id", user.id)
    .eq("website_id", website.id)
    .order("created_at", { ascending: false });

  const latestScan = scans?.[0];
  const averageScore =
    scans && scans.length
      ? Math.round(
          scans.reduce((total, scan) => total + Number(scan.score || 0), 0) /
            scans.length,
        )
      : 0;

  const highRiskCount =
    scans?.filter((scan) => scan.risk_level === "High").length ?? 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Link href="/websites" className="text-sm font-bold text-slate-600">
          Back to websites
        </Link>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">
                Website profile
              </p>
              <h1 className="mt-2 text-4xl font-black">
                {website.name || "Website"}
              </h1>
              <p className="mt-3 break-all text-slate-600">{website.url}</p>
              <p className="mt-2 text-sm text-slate-500">
                Added on {new Date(website.created_at).toLocaleDateString()}
              </p>

              <div className="mt-5">
                {latestScan ? (
                  <RiskBadge riskLevel={latestScan.risk_level} />
                ) : (
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                    Not scanned yet
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/scan?websiteId=${website.id}`}
                className="rounded-full bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800"
              >
                Scan website
              </Link>

              {latestScan ? (
                <Link
                  href={`/report/${latestScan.id}`}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 font-bold text-slate-950 hover:bg-slate-100"
                >
                  Latest report
                </Link>
              ) : null}

              <form action={deleteWebsite}>
                <input type="hidden" name="websiteId" value={website.id} />
                <button className="rounded-full border border-red-200 bg-red-50 px-5 py-3 font-bold text-red-700 hover:bg-red-100">
                  Delete
                </button>
              </form>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Total scans</p>
              <p className="mt-2 text-4xl font-black">{scans?.length ?? 0}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Latest score</p>
              <p className="mt-2 text-4xl font-black">
                {latestScan?.score ?? "--"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Average score</p>
              <p className="mt-2 text-4xl font-black">{averageScore || "--"}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">High risk scans</p>
              <p className="mt-2 text-4xl font-black">{highRiskCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Scan history</h2>

          {scans?.length ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Risk</th>
                    <th className="px-4 py-3">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => (
                    <tr key={scan.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(scan.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-black">{scan.score}</td>
                      <td className="px-4 py-3">
                        <RiskBadge riskLevel={scan.risk_level} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/report/${scan.id}`}
                          className="font-black text-slate-950 underline"
                        >
                          View report
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <p className="font-bold">No scans for this website yet.</p>
              <Link
                href={`/scan?websiteId=${website.id}`}
                className="mt-4 inline-flex rounded-full bg-slate-950 px-5 py-3 font-bold text-white"
              >
                Run first scan
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
