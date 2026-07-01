import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ScanForm } from "@/components/ScanForm";
import { createClient } from "@/lib/supabase/server";

export default async function ScanPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login before scanning a website");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-20">
        <ScanForm />
      </section>
    </main>
  );
}
