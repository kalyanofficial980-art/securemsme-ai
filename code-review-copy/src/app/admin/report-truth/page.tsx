import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminReportTruthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?message=Please login as admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin")
    redirect("/dashboard?message=Admin access required");

  const { data: reviews } = await supabase
    .from("report_truth_reviews")
    .select(
      "id, website_url, engine_version, review_status, truth_score, fake_risk_level, generic_text_count, repeated_fix_count, missing_evidence_count, cleaned_fix_count, manual_review_count, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">Admin internal</p>
        <h1 className="mt-2 text-4xl font-black">Report truth observability</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Monitor fake-looking report risk, generic text, repeated fixes,
          missing evidence and cleaned fixes.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-black">Latest truth cleanup reports</h2>
          <div className="mt-6 grid gap-4">
            {reviews?.length ? (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="break-all font-black">
                        {review.website_url}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(review.created_at).toLocaleString()} · engine{" "}
                        {review.engine_version}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black">
                      {review.review_status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Truth score</p>
                      <p className="text-2xl font-black">
                        {review.truth_score}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Fake risk</p>
                      <p className="text-2xl font-black">
                        {review.fake_risk_level}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Generic</p>
                      <p className="text-2xl font-black">
                        {review.generic_text_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Missing evidence</p>
                      <p className="text-2xl font-black">
                        {review.missing_evidence_count}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-sm font-bold">Cleaned</p>
                      <p className="text-2xl font-black">
                        {review.cleaned_fix_count}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No report truth reviews yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
