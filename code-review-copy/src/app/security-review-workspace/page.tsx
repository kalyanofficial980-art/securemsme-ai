import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const workflow = [
  {
    title: "Create client workspace",
    description:
      "Open one review workspace for every client website or project.",
  },
  {
    title: "Sync scanner findings",
    description:
      "Bring authorized vulnerability scanner findings into a bug lifecycle board.",
  },
  {
    title: "Track developer fixes",
    description:
      "Move bugs from open to in progress, fixed by developer and needs retest.",
  },
  {
    title: "Verify with retest proof",
    description:
      "Close findings only after verification, accepted risk or false-positive decision.",
  },
];

export default function SecurityReviewWorkspaceInfoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Client Cybersecurity Workflow
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          Security Review Workspace + Bug Lifecycle Dashboard
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          Replace messy freelancer follow-up with a structured client workspace:
          findings, evidence, developer fixes, lifecycle status, retest proof
          and client-ready summaries.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/reviews"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Open Workspaces
          </Link>
          <Link
            href="/vulnerability-scanner"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Vulnerability Scanner
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {workflow.map((item, index) => (
            <div
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <p className="text-sm font-black text-slate-500">
                Step {index + 1}
              </p>
              <h2 className="mt-2 text-xl font-black">{item.title}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
          <h2 className="text-2xl font-black text-emerald-950">
            High-paying service value
          </h2>
          <p className="mt-4 max-w-3xl leading-8 text-emerald-900">
            Clients pay more when you provide proof, structure, developer
            coordination, retest verification and clear management summaries —
            not only a one-time scan.
          </p>
        </div>
      </section>
    </main>
  );
}
