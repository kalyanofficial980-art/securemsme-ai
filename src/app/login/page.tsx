import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { resendConfirmation, signIn } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const message = params?.message;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto flex max-w-md flex-col px-6 py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black">Login</h1>
          <p className="mt-2 text-slate-600">
            Login to your VeyraSec dashboard.
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
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Email address"
            />

            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Password"
            />

            <button className="w-full rounded-full bg-slate-950 px-4 py-3 font-bold text-white hover:bg-slate-800">
              Login
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-sm font-black text-slate-700">
              Confirmation email expired or missing?
            </p>
            <form action={resendConfirmation} className="mt-3 flex gap-2">
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                placeholder="Your signup email"
              />
              <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-black hover:bg-slate-100">
                Resend
              </button>
            </form>
          </div>

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
