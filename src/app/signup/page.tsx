import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { signUp } from "@/app/auth/actions";

type SignupPageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const message = params?.message;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto flex max-w-md flex-col px-6 py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black">Create account</h1>
          <p className="mt-2 text-slate-600">
            Start your free VeyraSec account.
          </p>

          {message ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          ) : null}

          <form action={signUp} className="mt-8 space-y-4">
            <input
              name="fullName"
              type="text"
              autoComplete="name"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Full name"
            />

            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Email address"
            />

            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Password minimum 8 characters"
            />

            <button className="w-full rounded-full bg-slate-950 px-4 py-3 font-bold text-white hover:bg-slate-800">
              Create account
            </button>
          </form>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            We will send a confirmation email. You must confirm the address before
            signing in.
          </p>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-slate-950 underline">
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
