import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { requireAdmin } from "@/lib/admin";

const auditStack = [
  {
    title: "TypeScript build",
    command: "npm.cmd run build",
    purpose: "Catches type errors, broken routes, and production build issues.",
  },
  {
    title: "ESLint",
    command: "npm.cmd run lint",
    purpose: "Catches common code quality and Next.js issues.",
  },
  {
    title: "Vitest unit tests",
    command: "npm.cmd run test",
    purpose: "Tests pure logic like monitoring dates and trend helpers.",
  },
  {
    title: "Playwright E2E tests",
    command: "npm.cmd run e2e",
    purpose: "Tests real browser flows and protected/public routes.",
  },
  {
    title: "NPM security audit",
    command: "npm.cmd run audit:npm",
    purpose: "Checks dependency vulnerabilities without unsafe force updates.",
  },
  {
    title: "Lighthouse audit",
    command: "npm.cmd run audit:lighthouse",
    purpose: "Checks performance, accessibility, SEO, and best practices.",
  },
];

export default async function AdminAuditPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Link href="/admin" className="text-sm font-bold text-slate-600">
          Back to admin
        </Link>

        <p className="mt-6 text-sm font-bold text-slate-500">
          Advanced QA and audit
        </p>
        <h1 className="mt-2 text-4xl font-black">Testing command center</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          This is the pre-deploy quality gate. Before live deployment, run these
          checks and fix every important failure.
        </p>

        <div className="mt-10 grid gap-5">
          {auditStack.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <h2 className="text-xl font-black">{item.title}</h2>
                  <p className="mt-2 text-slate-600">{item.purpose}</p>
                </div>
                <code className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
                  {item.command}
                </code>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
          <h2 className="text-2xl font-black text-emerald-950">
            Advanced SaaS rule
          </h2>
          <p className="mt-3 leading-7 text-emerald-900">
            No deploy before build, unit tests, E2E smoke tests, dependency
            audit, and Lighthouse audit are checked.
          </p>
        </div>
      </section>
    </main>
  );
}
