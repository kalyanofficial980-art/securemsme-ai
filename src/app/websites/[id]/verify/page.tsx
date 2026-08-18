import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { VerificationStatusBadge } from "@/components/VerificationStatusBadge";
import {
  buildVerificationToken,
  getVerificationInstructions,
} from "@/lib/ownership-verification";
import { createClient } from "@/lib/supabase/server";
import { rotateVerificationToken, verifyOwnershipAction } from "./actions";

export default async function WebsiteVerifyPage({
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
    redirect("/login?message=Please login before verifying ownership");
  }

  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, url, name, verification_token, verification_status, verification_method, verified_at, deep_scan_enabled",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!website) {
    redirect("/websites?message=Website not found");
  }

  let token = website.verification_token as string | null;

  if (!token) {
    token = buildVerificationToken();

    await supabase
      .from("websites")
      .update({
        verification_token: token,
        verification_status: "unverified",
        verified_at: null,
        verified_by: null,
        permission_attested_at: null,
        deep_scan_enabled: false,
      })
      .eq("id", website.id)
      .eq("user_id", user.id);
  }

  const instructions = getVerificationInstructions(website.url, token);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl space-y-8 px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8">
          <Link
            href={`/websites/${website.id}`}
            className="text-sm font-bold text-slate-600"
          >
            Back to website
          </Link>

          <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black text-slate-500">
                Ownership verification
              </p>
              <h1 className="mt-2 break-all text-4xl font-black">
                {website.name || website.url}
              </h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                Verify you own or manage this website before unlocking deeper
                authorized scans. This protects your SaaS legally and makes it
                international-standard.
              </p>
            </div>

            <VerificationStatusBadge
              status={website.verification_status}
              deepScanEnabled={website.deep_scan_enabled}
            />
          </div>

          {message ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
              {message}
            </div>
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Method 1: DNS TXT</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Best for serious businesses and agencies. Add this TXT record in
              DNS provider.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-black text-slate-500">Type</p>
                <code className="mt-1 block rounded-2xl bg-slate-950 p-3 text-sm font-bold text-white">
                  {instructions.dns.type}
                </code>
              </div>
              <div>
                <p className="text-xs font-black text-slate-500">Name</p>
                <code className="mt-1 block break-all rounded-2xl bg-slate-950 p-3 text-sm font-bold text-white">
                  {instructions.dns.name}
                </code>
              </div>
              <div>
                <p className="text-xs font-black text-slate-500">Value</p>
                <code className="mt-1 block break-all rounded-2xl bg-slate-950 p-3 text-sm font-bold text-white">
                  {instructions.dns.value}
                </code>
              </div>
            </div>

            <form action={verifyOwnershipAction} className="mt-6 space-y-4">
              <input type="hidden" name="websiteId" value={website.id} />
              <input type="hidden" name="method" value="dns_txt" />
              <label className="flex gap-3 text-sm font-bold text-slate-700">
                <input name="permission" type="checkbox" />I own/manage this
                website or have permission to test it.
              </label>
              <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                Verify DNS
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Method 2: HTML file</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Upload a verification file to your website.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-black text-slate-500">File URL</p>
                <code className="mt-1 block break-all rounded-2xl bg-slate-950 p-3 text-sm font-bold text-white">
                  {instructions.htmlFile.url}
                </code>
              </div>
              <div>
                <p className="text-xs font-black text-slate-500">
                  File content
                </p>
                <code className="mt-1 block break-all rounded-2xl bg-slate-950 p-3 text-sm font-bold text-white">
                  {instructions.htmlFile.content}
                </code>
              </div>
            </div>

            <form action={verifyOwnershipAction} className="mt-6 space-y-4">
              <input type="hidden" name="websiteId" value={website.id} />
              <input type="hidden" name="method" value="html_file" />
              <label className="flex gap-3 text-sm font-bold text-slate-700">
                <input name="permission" type="checkbox" />I own/manage this
                website or have permission to test it.
              </label>
              <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                Verify file
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-black">Method 3: Meta tag</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Add this tag inside homepage head section.
            </p>

            <div className="mt-5">
              <p className="text-xs font-black text-slate-500">Meta tag</p>
              <code className="mt-1 block break-all rounded-2xl bg-slate-950 p-3 text-sm font-bold text-white">
                {instructions.metaTag.tag}
              </code>
            </div>

            <form action={verifyOwnershipAction} className="mt-6 space-y-4">
              <input type="hidden" name="websiteId" value={website.id} />
              <input type="hidden" name="method" value="meta_tag" />
              <label className="flex gap-3 text-sm font-bold text-slate-700">
                <input name="permission" type="checkbox" />I own/manage this
                website or have permission to test it.
              </label>
              <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                Verify meta tag
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h2 className="text-2xl font-black text-amber-950">
            Why this matters
          </h2>
          <p className="mt-3 leading-7 text-amber-900">
            Without verification, SecureMSME AI should only run safe public
            passive checks. After verification, deeper authorized checks can be
            unlocked for this website. This separates a serious SaaS from random
            unauthorized scanning tools.
          </p>
        </div>

        <form action={rotateVerificationToken}>
          <input type="hidden" name="websiteId" value={website.id} />
          <button className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black hover:bg-slate-100">
            Rotate verification token
          </button>
        </form>
      </section>
    </main>
  );
}
