import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthenticatedScanPanel } from "@/components/AuthenticatedScanPanel";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

type AuthenticatedRequest = {
  id: string;
  login_url: string;
  auth_method: string;
  test_account_role: string;
  credential_handling_mode: string;
  requested_intensity: string;
  status: string;
  admin_review_status: string;
  allowed_paths: string[];
  blocked_paths: string[];
  blocked_actions: string[];
  customer_notes?: string | null;
  created_at: string;
  expires_at: string;
};

export default async function AuthenticatedScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login to request authenticated scan");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let scanQuery = supabase
    .from("scans")
    .select("id, user_id, website_id, website_url, created_at")
    .eq("id", id);

  if (profile?.role !== "admin") {
    scanQuery = scanQuery.eq("user_id", user.id);
  }

  const { data: scan } = await scanQuery.single();

  if (!scan) {
    redirect("/dashboard?message=Authenticated scan page not found");
  }

  let verifiedScope = false;
  let targetUrl = scan.website_url;

  if (scan.website_id) {
    const { data: website } = await supabase
      .from("websites")
      .select(
        "id, user_id, url, verification_status, deep_scan_enabled, permission_attested_at",
      )
      .eq("id", scan.website_id)
      .maybeSingle();

    targetUrl = website?.url || scan.website_url;
    verifiedScope = Boolean(
      website?.verification_status === "verified" &&
      website?.deep_scan_enabled &&
      website?.permission_attested_at,
    );
  }

  const { data: requests } = scan.website_id
    ? await supabase
        .from("authenticated_scan_requests")
        .select(
          "id, login_url, auth_method, test_account_role, credential_handling_mode, requested_intensity, status, admin_review_status, allowed_paths, blocked_paths, blocked_actions, customer_notes, created_at, expires_at",
        )
        .eq("website_id", scan.website_id)
        .eq("user_id", scan.user_id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href={`/report/${scan.id}/security-hub`}
              className="text-sm font-bold text-slate-600"
            >
              Back to customer report hub
            </Link>
            <p className="mt-6 text-sm font-bold text-slate-500">
              Authenticated customer scan
            </p>
            <h1 className="mt-2 break-all text-4xl font-black">{targetUrl}</h1>
            <p className="mt-3 text-slate-600">
              Request safe future review for login-protected pages using a
              customer-provided low-privilege test account.
            </p>
          </div>

          {scan.website_id ? (
            <Link
              href={`/websites/${scan.website_id}/verify`}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100"
            >
              Verification settings
            </Link>
          ) : null}
        </div>

        <AuthenticatedScanPanel
          scanId={scan.id}
          targetUrl={targetUrl}
          verifiedScope={verifiedScope}
          requests={(requests || []) as AuthenticatedRequest[]}
          message={message}
        />
      </section>
    </main>
  );
}
