import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const features = [
  {
    title: "Evidence warehouse",
    description:
      "Stores engine, finding, accuracy and workspace proof in one traceable place.",
  },
  {
    title: "Hash proof chain",
    description:
      "Each evidence item stores a SHA-256 hash and previous hash reference.",
  },
  {
    title: "Client-safe proof",
    description:
      "Separates client-safe proof from technical/internal evidence.",
  },
  {
    title: "Report claim support",
    description:
      "Every strong report claim should link back to supporting evidence.",
  },
  {
    title: "Validation workflow",
    description:
      "Evidence can be validated, rejected, expired or marked needs-review.",
  },
  {
    title: "Snapshots",
    description:
      "Create pre-report, client-share, post-retest or monitoring snapshots.",
  },
];

export default function EvidenceWarehouseInfoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Advanced Security Platform
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Evidence Warehouse v2 + Proof Chain System
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI stores proof behind scanner findings, accuracy
          assessments, developer fixes and client reports. This makes
          high-paying security reports evidence-backed, traceable and safer to
          trust.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Open Dashboard
          </Link>
          <Link
            href="/scan-orchestrator"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Scan Orchestrator
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-xl font-black">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-blue-200 bg-blue-50 p-8">
          <h2 className="text-2xl font-black text-blue-950">
            Professional rule
          </h2>
          <p className="mt-4 max-w-3xl leading-8 text-blue-900">
            Strong client report wording should be used only when evidence
            exists, evidence quality is enough, and validation status supports
            the claim.
          </p>
        </div>
      </section>
    </main>
  );
}
