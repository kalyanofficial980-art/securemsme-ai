import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

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
            <p className="mt-2 text-4xl font-black">0</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Average score</p>
            <p className="mt-2 text-4xl font-black">--</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Plan</p>
            <p className="mt-2 text-4xl font-black capitalize">
              {profile?.plan || "free"}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Start your first website scan</h2>
          <p className="mt-3 text-slate-600">
            Scanner engine will be connected in Part 7.
          </p>

          <Link
            href="/scan"
            className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800"
          >
            Go to scan page
          </Link>
        </div>
      </section>
    </main>
  );
}
