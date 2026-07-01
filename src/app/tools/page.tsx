import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { getToolRegistry, TOOL_RUNNER_SAFE_BOUNDARY } from "@/lib/tool-runner";

export default function ToolsPage() {
  const tools = getToolRegistry();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          SecureMSME AI tool runner
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Built-in cybersecurity tools without customer installation
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          SecureMSME AI uses a safe backend tool-runner architecture. Customers
          add a website, verify ownership for deeper modules, and receive
          normalized evidence in reports.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Start scan
          </Link>
          <Link
            href="/ownership-verification"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Ownership verification
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <p className="text-xs font-black uppercase text-slate-500">
                {tool.category} · {tool.mode}
              </p>
              <h2 className="mt-2 text-2xl font-black">{tool.name}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                {tool.customerValue}
              </p>
              <p className="mt-4 text-sm font-bold text-slate-500">
                Status: {tool.availability}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">
            Safe scanning boundary
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {TOOL_RUNNER_SAFE_BOUNDARY.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white/70 p-4 font-bold text-red-900"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
