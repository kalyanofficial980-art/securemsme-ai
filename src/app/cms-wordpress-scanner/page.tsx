import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const checks = [
  "WordPress REST API signal review",
  "wp-login and wp-admin surface review",
  "XML-RPC HEAD-only status check",
  "Plugin public asset signal detection",
  "Theme public asset signal detection",
  "WooCommerce/storefront signal review",
  "readme/license status review",
  "User endpoint status check without storing user data",
];

export default function CmsWordPressScannerPublicPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          CMS/WordPress deep risk scanner
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          WordPress and WooCommerce risk signals for MSME websites
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI can review public WordPress, WooCommerce, plugin, theme,
          login/admin, and XML-RPC signals after ownership verification and
          permission.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/real-safe-templates"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Real safe templates
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {checks.map((check) => (
            <div
              key={check}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-2xl font-black">{check}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                Safe verified response evidence is reviewed with clear customer
                and developer guidance.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Safety boundary</h2>
          <p className="mt-4 max-w-3xl leading-8 text-red-900">
            No password guessing, brute force, login bypass, exploit payloads,
            XML-RPC POST calls, form submission, destructive testing, or private
            data collection.
          </p>
        </div>
      </section>
    </main>
  );
}
