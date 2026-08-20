import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { signInWithGoogle } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{ message?: string; next?: string }>;
};

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const message = params?.message;
  const next = safeNextPath(params?.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(next);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="hidden lg:block">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Secure access</p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.045em]">One account for websites, scans and paid access.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">Google OAuth keeps authentication simple while ownership, scan history and plan access remain controlled on the server.</p>
          <dl className="mt-8 max-w-xl divide-y divide-slate-300 border-y border-slate-300 text-sm">
            <div className="grid grid-cols-[160px_1fr] gap-4 py-4"><dt className="font-semibold">Authentication</dt><dd className="text-slate-600">Google OAuth</dd></div>
            <div className="grid grid-cols-[160px_1fr] gap-4 py-4"><dt className="font-semibold">Workspace</dt><dd className="text-slate-600">Websites, scans, reports and billing</dd></div>
            <div className="grid grid-cols-[160px_1fr] gap-4 py-4"><dt className="font-semibold">Password</dt><dd className="text-slate-600">No VeyraSec password required</dd></div>
          </dl>
        </div>

        <div className="border border-slate-300 bg-white p-7 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
            <div className="flex h-9 w-9 items-center justify-center bg-slate-950 text-xs font-bold text-white">VS</div>
            <div><p className="text-sm font-semibold">VeyraSec</p><p className="text-xs text-slate-500">Security workspace</p></div>
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Continue with the Google account you want tied to this workspace.</p>
          {message ? <div className="mt-5 border-l-2 border-amber-600 bg-amber-50 p-3 text-sm font-medium text-amber-950">{message}</div> : null}
          <form action={signInWithGoogle} className="mt-6">
            <input type="hidden" name="next" value={next} />
            <button className="flex w-full items-center justify-center gap-3 bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">
              <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center bg-white text-xs font-bold text-slate-950">G</span>
              Continue with Google
            </button>
          </form>
          <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">No VeyraSec password or confirmation email is required for this sign-in flow.</p>
        </div>
      </section>
    </main>
  );
}
