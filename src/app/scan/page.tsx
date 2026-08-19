import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ScanForm } from "@/components/ScanForm";
import { createClient } from "@/lib/supabase/server";

type ScanPageProps = {
  searchParams: Promise<{
    websiteId?: string;
  }>;
};

export default async function ScanPage({ searchParams }: ScanPageProps) {
  const { websiteId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login before scanning");
  }

  const { data: websites } = await supabase
    .from("websites")
    .select("id, name, url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <ScanForm websites={websites ?? []} selectedWebsiteId={websiteId} />
      </section>
    </main>
  );
}
