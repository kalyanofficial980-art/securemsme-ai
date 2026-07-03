import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { apiSecurityBlockedActions } from "@/lib/api-security-review-v2";

const features = [
  "OpenAPI/Swagger discovery",
  "GraphQL signal review",
  "Endpoint inventory",
  "Sensitive endpoint detection",
  "Mutation method review",
  "Auth requirement classification",
  "Public API docs exposure review",
  "API CORS signal review",
  "Developer fix guidance",
  "Client-safe API summary",
];

export default function ApiSecurityReviewInfoPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-black text-slate-500">
          Advanced API Security
        </p>
        <h1 className="mt-2 max-w-4xl text-5xl font-black tracking-tight">
          API Security Review v2
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-slate-600">
          Discover API documentation, inventory endpoints, classify
          sensitive/mutation routes, and produce safe developer guidance without
          executing dangerous requests.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-slate-950 px-6 py-3 font-black text-white hover:bg-slate-800"
          >
            Open Dashboard
          </Link>
          <Link
            href="/authenticated-safe-review"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 font-black hover:bg-slate-100"
          >
            Authenticated Review
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature}
              className="rounded-3xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-xl font-black">{feature}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Built for authorized defensive API security review only.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-2xl font-black text-red-950">Blocked actions</h2>
          <div className="mt-5 grid gap-3">
            {apiSecurityBlockedActions.map((action) => (
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
