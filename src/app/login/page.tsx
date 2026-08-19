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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <section className="mx-auto flex max-w-md flex-col px-6 py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Secure sign in
          </p>
          <h1 className="mt-2 text-3xl font-black">Continue to VeyraSec</h1>
          <p className="mt-2 text-slate-600">
            Use your Google account to access your dashboard.
          </p>

          {message ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          ) : null}

          <form action={signInWithGoogle} className="mt-8">
            <button className="flex w-full items-center justify-center gap-3 rounded-full bg-slate-950 px-4 py-3 font-bold text-white hover:bg-slate-800">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950"
              >
                G
              </span>
              Continue with Google
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            No VeyraSec password or confirmation email required.
          </p>
        </div>
      </section>
    </main>
  );
}
