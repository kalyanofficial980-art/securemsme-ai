import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { signInWithGoogle } from "@/app/auth/actions";
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
    <main className="min-h-screen text-slate-950">
      <Navbar />

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[1fr_460px] lg:items-center">
        <div className="hidden lg:block">
          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3.5 py-2 text-sm font-black text-sky-950">
            One secure account for the full workflow
          </span>
          <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[1.02] tracking-[-0.05em]">
            Sign in once. Keep every website, scan and retest together.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            VeyraSec uses Google sign-in so there is no extra password to create or reset.
          </p>

          <div className="mt-9 grid max-w-xl gap-3">
            {[
              "Saved websites and scan history stay tied to your account",
              "Ownership verification and paid entitlements stay server-controlled",
              "No VeyraSec password or email-confirmation loop",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">✓</span>
                <p className="text-sm font-bold leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-900/10 sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-sm">
            V
          </div>
          <p className="mt-7 text-sm font-black uppercase tracking-[0.16em] text-sky-700">
            Secure sign in
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Continue to VeyraSec
          </h2>
          <p className="mt-3 leading-7 text-slate-600">
            Use your Google account to open your security workspace.
          </p>

          {message ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-950">
              {message}
            </div>
          ) : null}

          <form action={signInWithGoogle} className="mt-8">
            <button className="flex w-full items-center justify-center gap-3 rounded-full bg-slate-950 px-5 py-3.5 font-black text-white shadow-lg shadow-slate-950/10 hover:-translate-y-0.5 hover:bg-slate-800">
              <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950">
                G
              </span>
              Continue with Google
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-center text-xs leading-5 text-slate-500">
              By continuing, you access VeyraSec through Google OAuth. No VeyraSec password is stored for this sign-in flow.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
