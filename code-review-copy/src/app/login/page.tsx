import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { signIn } from "@/app/auth/actions";

type LoginPageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const message = params?.message;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto flex max-w-md flex-col px-6 py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black">Login</h1>
          <p className="mt-2 text-slate-600">
            Login to your SecureMSME AI dashboard.
          </p>

          {message ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          ) : null}

          <form action={signIn} className="mt-8 space-y-4">
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Email address"
            />

            <input
              name="password"
              type="password"
              required
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Password"
            />

            <button className="w-full rounded-full bg-slate-950 px-4 py-3 font-bold text-white hover:bg-slate-800">
              Login
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            New user?{" "}
            <Link href="/signup" className="font-bold text-slate-950 underline">
              Create account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
