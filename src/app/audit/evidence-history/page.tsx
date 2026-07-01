import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function EvidenceHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to access evidence history");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Audit tools</p>
        <h1 className="mt-2 text-4xl font-black">Evidence History</h1>
        <p className="mt-4 text-slate-600">
          Optional future area for tracking imported evidence history. Current
          reports already include evidence calibration and false-positive guard.
        </p>
      </section>
    </main>
  );
}
