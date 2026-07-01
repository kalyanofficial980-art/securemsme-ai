import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const pages = [
  { href: "/legal/terms", title: "Terms of service" },
  { href: "/legal/privacy", title: "Privacy policy" },
  { href: "/legal/refund", title: "Refund policy" },
  { href: "/legal/responsible-disclosure", title: "Responsible disclosure" },
];

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-bold text-slate-500">Legal center</p>
        <h1 className="mt-2 text-4xl font-black">Legal and policy pages</h1>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {pages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="rounded-3xl border border-slate-200 bg-white p-8 text-xl font-black hover:bg-slate-100"
            >
              {page.title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
