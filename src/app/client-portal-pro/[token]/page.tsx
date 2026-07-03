import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

type PortalSection = {
  id: string;
  title: string;
  section_type: string;
  display_order: number;
  status_label: string;
  body: string;
  evidence_summary: string;
  action_summary: string;
  blocked_claim: string;
};

function badgeClass(value: string) {
  if (
    ["Ready", "active"].includes(value) ||
    value.includes("/100") ||
    value.includes("%")
  )
    return "bg-emerald-100 text-emerald-950";
  if (["Needs review", "Important"].includes(value))
    return "bg-amber-100 text-amber-950";
  return "bg-slate-100 text-slate-700";
}

export default async function ClientPortalProSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = (await createClient()) as any;
  const { data: portal, error } = await supabase
    .rpc("get_client_portal_pro_link", { public_token: token })
    .maybeSingle();

  if (error || !portal) notFound();

  const sections = ((portal.sections || []) as PortalSection[]).sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0),
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <p className="text-sm font-black text-blue-700">Client Portal Pro</p>
          <h1 className="mt-2 text-4xl font-black text-blue-950">
            Client Security Progress Portal
          </h1>
          <p className="mt-4 max-w-3xl break-all leading-8 text-blue-900">
            {portal.target_url}
          </p>
          <p className="mt-4 max-w-4xl leading-8 text-blue-900">
            {portal.portal_summary}
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            ["Executive", portal.executive_score],
            ["Report", portal.report_readiness_score],
            ["Fix", portal.fix_progress_score],
            ["Retest", portal.retest_pass_rate],
            ["Client", portal.client_readiness_score],
          ].map(([label, score]) => (
            <div
              key={String(label)}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <p className="text-sm font-black text-slate-500">{label}</p>
              <p className="mt-3 text-4xl font-black">{score}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-950"
                  style={{
                    width: Math.max(3, Math.min(100, Number(score))) + "%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-5">
          {sections.map((section) => (
            <div
              key={section.id}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">
                    {section.section_type}
                  </p>
                  <h2 className="mt-2 text-2xl font-black">{section.title}</h2>
                </div>
                <span
                  className={"rounded-full px-3 py-1 text-xs font-black " + badgeClass(section.status_label)}
                >
                  {section.status_label}
                </span>
              </div>
              <p className="mt-5 rounded-2xl bg-slate-50 p-5 leading-8 text-slate-700">
                {section.body}
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                  <p className="font-black">Evidence</p>
                  <p className="mt-2">{section.evidence_summary}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  <p className="font-black">Action</p>
                  <p className="mt-2">{section.action_summary}</p>
                </div>
                <div className="rounded-2xl bg-red-50 p-4 text-sm leading-6 text-red-900">
                  <p className="font-black">Blocked claim</p>
                  <p className="mt-2">{section.blocked_claim}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold leading-7 text-amber-950">
          This portal is not a legal compliance certificate and does not
          guarantee that every vulnerability was found or fixed.
          <span className="mt-2 block">
            Link expires: {new Date(portal.expires_at).toLocaleString()}
          </span>
        </div>
      </section>
    </main>
  );
}
