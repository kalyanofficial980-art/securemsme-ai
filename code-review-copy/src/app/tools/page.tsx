import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const checks = [
  {
    title: "Website security score",
    text: "Checks public website signals and turns them into a simple score.",
  },
  {
    title: "Priority fixes",
    text: "Shows what should be fixed first and why it matters for the business.",
  },
  {
    title: "Developer instructions",
    text: "Creates clear tasks that can be sent to a web developer or website vendor.",
  },
  {
    title: "Evidence confidence",
    text: "Separates confirmed evidence from items that need expert review.",
  },
  {
    title: "Before / after proof",
    text: "Tracks improvement after fixes and helps show proof to customers or management.",
  },
  {
    title: "Safe advanced checks",
    text: "Runs only customer-safe checks and avoids exploit-style testing.",
  },
];

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Advanced website security checks
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Clear security reports for business owners and developers
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI checks public website security signals, explains the
          business risk, creates developer tasks, and helps track improvement
          after fixes.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start website check
          </Link>
          <Link
            href="/trust"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Trust and safety
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {checks.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-2xl font-black">{item.title}</h2>
              <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h2 className="text-2xl font-black text-amber-950">
            Important report boundary
          </h2>
          <p className="mt-4 max-w-3xl leading-8 text-amber-900">
            This platform gives safe public security posture checks and
            evidence-based recommendations. It does not claim full penetration
            testing, full compliance certification, or that no vulnerabilities
            exist.
          </p>
        </div>
      </section>
    </main>
  );
}
