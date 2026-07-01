import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

type ScanRow = {
  id: string;
  website_url: string;
  score: number;
  risk_level: string;
  created_at: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to open dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, plan, full_name")
    .eq("id", user.id)
    .single();

  const { data: scansData } = await supabase
    .from("scans")
    .select("id, website_url, score, risk_level, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const scans = (scansData ?? []) as ScanRow[];
  const totalScans = scans.length;
  const averageScore =
    totalScans > 0
      ? Math.round(
          scans.reduce((sum, scan) => sum + scan.score, 0) / totalScans,
        )
      : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <h1 className="text-4xl font-black">Dashboard</h1>
            <p className="mt-3 text-slate-600">
              Welcome, {profile?.full_name || profile?.email || user.email}.
            </p>
          </div>

          <form action={signOut}>
            <button className="rounded-full border border-slate-300 bg-white px-5 py-3 font-bold text-slate-950 hover:bg-slate-100">
              Logout
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Total scans</p>
            <p className="mt-2 text-4xl font-black">{totalScans}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Average score</p>
            <p className="mt-2 text-4xl font-black">
              {averageScore === null ? "--" : averageScore}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Plan</p>
            <p className="mt-2 text-4xl font-black capitalize">
              {profile?.plan || "free"}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black">Scan history</h2>
              <p className="mt-2 text-slate-600">
                Your latest website safety reports.
              </p>
            </div>

            <Link
              href="/scan"
              className="rounded-full bg-slate-950 px-6 py-3 text-center font-bold text-white hover:bg-slate-800"
            >
              New scan
            </Link>
          </div>

          {scans.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <h3 className="text-xl font-black">No scans yet</h3>
              <p className="mt-2 text-slate-600">
                Run your first website scan to see reports here.
              </p>
              <Link
                href="/scan"
                className="mt-5 inline-flex rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800"
              >
                Start first scan
              </Link>
            </div>
          ) : (
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-12 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
                <div className="col-span-5">Website</div>
                <div className="col-span-2">Score</div>
                <div className="col-span-2">Risk</div>
                <div className="col-span-3">Action</div>
              </div>

              {scans.map((scan) => (
                <div
                  key={scan.id}
                  className="grid grid-cols-12 items-center border-t border-slate-200 px-4 py-4 text-sm"
                >
                  <div className="col-span-5 truncate font-semibold">
                    {scan.website_url}
                  </div>
                  <div className="col-span-2 font-black">{scan.score}</div>
                  <div className="col-span-2 font-semibold">
                    {scan.risk_level}
                  </div>
                  <div className="col-span-3">
                    <Link
                      href={`/report/${scan.id}`}
                      className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      View report
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
