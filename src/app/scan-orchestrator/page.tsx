import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  blockedPipelineActions,
  engineDefinitions,
} from "@/lib/scan-orchestrator-v2";

export default function ScanOrchestratorInfoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Advanced Scanner Platform
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Scan Orchestrator v2 + Engine Execution Pipeline
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI runs security review engines in a controlled pipeline
          with authorization gates, safe method limits, coverage tracking, retry
          controls and engine-by-engine observability.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Open Dashboard
          </Link>
          <Link
            href="/accuracy-foundation"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Accuracy Foundation
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {engineDefinitions.map((engine) => (
            <div
              key={engine.engineKey}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <p className="text-xs font-black uppercase text-slate-500">
                {engine.engineGroup}
              </p>
              <h2 className="mt-2 text-xl font-black">{engine.engineName}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {engine.description}
              </p>
              <p className="mt-4 text-xs font-black text-slate-500">
                methods: {engine.safeMethods.join(", ")} · weight{" "}
                {engine.weight}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Blocked actions</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {blockedPipelineActions.map((action) => (
              <div
                key={action}
                className="rounded-2xl bg-white/80 p-4 text-sm font-bold text-red-900"
              >
                {action}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
