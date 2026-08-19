import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { VerificationStatusBadge } from "@/components/VerificationStatusBadge";
import { buildVerificationToken, getVerificationInstructions } from "@/lib/ownership-verification";
import { createClient } from "@/lib/supabase/server";
import { rotateVerificationToken, verifyOwnershipAction } from "./actions";

export default async function WebsiteVerifyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ message?: string }> }) {
  const { id } = await params;
  const { message } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?message=Please login before verifying ownership");

  const { data: website } = await supabase.from("websites").select("id, url, name, verification_token, verification_status, verification_method, verified_at, deep_scan_enabled").eq("id", id).eq("user_id", user.id).single();
  if (!website) redirect("/websites?message=Website not found");

  let token = website.verification_token as string | null;
  if (!token) {
    token = buildVerificationToken();
    await supabase.from("websites").update({ verification_token: token, verification_status: "unverified", verified_at: null, verified_by: null, permission_attested_at: null, deep_scan_enabled: false }).eq("id", website.id).eq("user_id", user.id);
  }

  const instructions = getVerificationInstructions(website.url, token);
  const methods = [
    { key: "dns_txt", title: "DNS TXT", description: "Best for managed domains and agency-controlled DNS.", fields: [["Type", instructions.dns.type], ["Name", instructions.dns.name], ["Value", instructions.dns.value]], button: "Verify DNS" },
    { key: "html_file", title: "HTML file", description: "Publish a verification file at the required public URL.", fields: [["File URL", instructions.htmlFile.url], ["File content", instructions.htmlFile.content]], button: "Verify file" },
    { key: "meta_tag", title: "Meta tag", description: "Add the verification tag inside the homepage head section.", fields: [["Meta tag", instructions.metaTag.tag]], button: "Verify meta tag" },
  ] as const;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href={`/websites/${website.id}`} className="text-sm font-semibold text-blue-700">← Website details</Link>

        <div className="mt-6 flex flex-col justify-between gap-5 border-b border-slate-300 pb-7 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Ownership gate</p>
            <h1 className="mt-2 break-all text-3xl font-semibold tracking-[-0.04em]">{website.name || website.url}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Verification is required before deeper passive review. Standard public scans remain available without it.</p>
          </div>
          <VerificationStatusBadge status={website.verification_status} deepScanEnabled={website.deep_scan_enabled} />
        </div>

        {message ? <div className="mt-6 border-l-2 border-amber-600 bg-amber-50 p-4 text-sm font-medium text-amber-900">{message}</div> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="border border-slate-300 bg-white self-start">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold">Verification methods</div>
            <div className="divide-y divide-slate-200 text-sm">
              <div className="px-4 py-3">01 · DNS TXT</div>
              <div className="px-4 py-3">02 · HTML file</div>
              <div className="px-4 py-3">03 · Meta tag</div>
            </div>
            <div className="border-t border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500">Choose one method. The proof must exist on the website or domain you control.</div>
          </aside>

          <div className="space-y-5">
            {methods.map((method, index) => (
              <section key={method.key} className="border border-slate-300 bg-white">
                <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 md:grid-cols-[70px_1fr]">
                  <span className="font-mono text-xs text-slate-400">0{index + 1}</span>
                  <div><h2 className="text-base font-semibold">{method.title}</h2><p className="mt-1 text-sm text-slate-500">{method.description}</p></div>
                </div>
                <div className="p-5">
                  <dl className="divide-y divide-slate-200 border border-slate-200">
                    {method.fields.map(([label, value]) => (
                      <div key={label} className="grid gap-2 p-4 md:grid-cols-[120px_1fr]"><dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</dt><dd><code className="break-all font-mono text-xs text-slate-800">{value}</code></dd></div>
                    ))}
                  </dl>
                  <form action={verifyOwnershipAction} className="mt-5">
                    <input type="hidden" name="websiteId" value={website.id} />
                    <input type="hidden" name="method" value={method.key} />
                    <label className="flex items-start gap-3 text-sm text-slate-700"><input name="permission" type="checkbox" className="mt-0.5" /><span>I own/manage this website or have explicit permission to test it.</span></label>
                    <button className="mt-4 bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">{method.button}</button>
                  </form>
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-5 border-t border-slate-300 pt-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold">Security boundary</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Without verification, VeyraSec runs safe public checks only. Deeper passive workflows remain locked until ownership or explicit permission is confirmed.</p>
          </div>
          <form action={rotateVerificationToken}>
            <input type="hidden" name="websiteId" value={website.id} />
            <button className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Rotate verification token</button>
          </form>
        </div>
      </section>
    </main>
  );
}
