import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAuthenticatedScansPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Please login as admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard?message=Admin access required");
  }

  const { data: requests } = await supabase
    .from("authenticated_scan_requests")
    .select(
      "id, target_url, login_url, auth_method, test_account_role, credential_handling_mode, requested_intensity, status, admin_review_status, allowed_paths, blocked_paths, created_at, expires_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">
          Authenticated scan requests
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Review customer requests before enabling future authenticated scan
          sessions. Do not approve admin accounts, real customer accounts, or
          unsafe mutation scope.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest requests</h2>
          <div className="mt-6 grid gap-4">
            {requests?.length ? (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">
                        {request.target_url}
                      </p>
                      <p className="mt-1 break-all text-sm text-slate-600">
                        Login: {request.login_url}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {request.auth_method} · {request.requested_intensity} ·{" "}
                        {request.test_account_role} ·{" "}
                        {request.credential_handling_mode}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(request.created_at).toLocaleString()} ·
                        expires{" "}
                        {new Date(request.expires_at).toLocaleDateString()}
                      </p>
                    </div>

                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-900">
                      {request.admin_review_status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="font-black">Allowed</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {(request.allowed_paths || []).slice(0, 12).join(", ")}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="font-black">Blocked</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {(request.blocked_paths || []).slice(0, 12).join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">
                No authenticated scan requests yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
