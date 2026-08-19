import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";

const workflow = [
  ["1", "Scan", "Run safe public checks and collect evidence."],
  ["2", "Prioritize", "Turn signals into clear severity and fix order."],
  ["3", "Fix", "Share developer-ready remediation guidance."],
  ["4", "Retest", "Show what changed after remediation."],
] as const;

type HomeProps = {
  searchParams?: Promise<{
    code?: string;
    error?: string;
    error_description?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  if (params?.code) {
    const callback = new URLSearchParams({
      code: params.code,
      next: "/dashboard",
    });
    redirect(`/auth/callback?${callback.toString()}`);
  }

  if (params?.error || params?.error_description) {
    const message = encodeURIComponent(
      "Google sign-in was not completed. Please try again.",
    );
    redirect(`/login?message=${message}`);
  }

  return (
    <main className="min-h-screen text-slate-950">
      <Navbar />

      <section className="relative overflow-hidden border-b border-slate-200/80 bg-white/70">
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_18%_12%,rgba(14,165,233,0.13),transparent_28rem),radial-gradient(circle_at_82%_8%,rgba(20,184,166,0.12),transparent_24rem)]" />
        <div className="mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-2 text-sm font-black text-sky-950 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Security workflow built for agencies and small teams
            </div>

            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">
              Find website risk.
              <span className="block text-slate-500">Prove the fix.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              VeyraSec turns safe website security checks into prioritized findings,
              developer-ready fixes, ownership-verified deeper review, and clear retest evidence.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-950/10 hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Start free security review
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-black text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50"
              >
                View plans
              </Link>
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 text-sm font-bold text-slate-600 sm:grid-cols-3">
              {["Safe public checks", "Ownership controls", "Client-ready reports"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-800">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-sky-200/45 via-white to-emerald-200/40 blur-2xl" />
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-2xl shadow-slate-950/15">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="text-sm font-black text-white">Security posture</span>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">VEYRASEC</span>
              </div>

              <div className="grid gap-6 p-6 sm:grid-cols-[150px_1fr]">
                <div className="rounded-3xl bg-white p-5 text-slate-950">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Score</p>
                  <p className="mt-2 text-6xl font-black tracking-[-0.06em]">82</p>
                  <p className="mt-1 text-sm font-bold text-amber-700">Medium risk</p>
                </div>

                <div className="space-y-3">
                  {[
                    ["Website security", "93", "Strong"],
                    ["Exposure risk", "100", "Clear"],
                    ["Website hygiene", "55", "Needs work"],
                    ["Trust & privacy", "25", "Priority"],
                  ].map(([label, score, status]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-200">{label}</span>
                        <span className="text-sm font-black text-white">{score}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{status}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 border-t border-white/10 bg-white/[0.035] p-6 sm:grid-cols-3">
                {[
                  ["0", "Critical"],
                  ["1", "Medium"],
                  ["6", "Action items"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl bg-white/5 px-4 py-4">
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-sky-700">Workflow</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950">
            From first scan to client-ready evidence.
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            The product should feel like a security workflow, not a collection of technical screens.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-4">
          {workflow.map(([step, title, body]) => (
            <div key={step} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:-translate-y-1 hover:shadow-lg">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">{step}</span>
              <h3 className="mt-6 text-xl font-black tracking-[-0.02em]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-sky-300">Designed for trust</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.035em] sm:text-4xl">
              Safe checks first. Deeper review only after ownership or permission.
            </h2>
            <p className="mt-4 max-w-3xl leading-7 text-slate-300">
              VeyraSec does not use destructive testing, brute force, login bypass, or private-data access in the standard workflow.
            </p>
          </div>
          <Link
            href="/trust"
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-black text-white hover:bg-white/15"
          >
            Read trust & safety
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 VeyraSec. Authorized security review workflow.</p>
        <div className="flex gap-5 font-bold">
          <Link href="/pricing" className="hover:text-slate-950">Pricing</Link>
          <Link href="/trust" className="hover:text-slate-950">Trust</Link>
          <Link href="/login" className="hover:text-slate-950">Login</Link>
        </div>
      </footer>
    </main>
  );
}
