import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ScanAccessSetup } from "@/components/ScanAccessSetup";
import { createClient } from "@/lib/supabase/server";

export default async function ScanAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login to configure Scan Access");

  const { data: website } = await supabase
    .from("websites")
    .select("id, url, name, verification_status, deep_scan_enabled, permission_attested_at, scan_access_enabled, scan_access_token_prefix, scan_access_configured_at, scan_access_last_verified_at, scan_access_last_status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!website) redirect("/websites?message=Website not found");
  if (website.verification_status !== "verified" || !website.deep_scan_enabled || !website.permission_attested_at) {
    redirect(`/websites/${website.id}/verify?message=Verify ownership and permission before configuring Scan Access`);
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <Link href={`/websites/${website.id}`} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
          ← Website workspace
        </Link>
        <div className="mt-6 border-b border-slate-300 pb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">Deep Scan connectivity</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">Verified Scan Access</h1>
          <p className="mt-3 break-all text-sm text-slate-500">{website.name || website.url} · {website.url}</p>
        </div>

        <div className="mt-8">
          <ScanAccessSetup
            websiteId={website.id}
            websiteUrl={website.url}
            enabled={Boolean(website.scan_access_enabled)}
            tokenPrefix={website.scan_access_token_prefix || null}
            configuredAt={website.scan_access_configured_at || null}
            lastVerifiedAt={website.scan_access_last_verified_at || null}
            lastStatus={(website.scan_access_last_status || "never") as "never" | "verified" | "blocked" | "error"}
          />
        </div>
      </section>
    </main>
  );
}
