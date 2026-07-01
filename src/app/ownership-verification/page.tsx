import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const methods = [
  {
    title: "DNS TXT verification",
    body: "Best for businesses and agencies. Add a TXT record to prove domain control.",
  },
  {
    title: "HTML file verification",
    body: "Upload a token file under .well-known to prove website file access.",
  },
  {
    title: "Meta tag verification",
    body: "Add a SecureMSME verification meta tag on the homepage.",
  },
];

export default function OwnershipVerificationPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-bold text-slate-500">
          Authorized security testing
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black leading-tight">
          Ownership verification before deeper scans
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          SecureMSME AI keeps normal public scans safe for everyone. Deeper
          authorized checks unlock only after the customer proves they own,
          manage, or have permission to test the website.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {methods.map((method) => (
            <div
              key={method.title}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <h2 className="text-2xl font-black">{method.title}</h2>
              <p className="mt-3 leading-7 text-slate-600">{method.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
          <h2 className="text-2xl font-black text-emerald-950">
            International-standard boundary
          </h2>
          <p className="mt-3 leading-7 text-emerald-900">
            This protects customers, avoids unauthorized testing, and makes
            SecureMSME AI more serious than random scanner tools.
          </p>
        </div>

        <Link
          href="/websites"
          className="mt-8 inline-flex rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800"
        >
          Verify a website
        </Link>
      </section>
    </main>
  );
}
