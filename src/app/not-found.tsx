import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-sm font-bold text-slate-500">404</p>
        <h1 className="mt-2 text-4xl font-black">Page not found</h1>
        <p className="mt-4 text-slate-600">
          The page you are looking for does not exist or has moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-full bg-slate-950 px-6 py-3 font-bold text-white hover:bg-slate-800"
        >
          Go to dashboard
        </Link>
      </section>
    </main>
  );
}
