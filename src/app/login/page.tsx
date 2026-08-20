import { redirect } from "next/navigation";
import { signInWithGoogle } from "@/app/auth/actions";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{ message?: string; next?: string }>;
};

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.77H12v3.41h5.52a4.7 4.7 0 0 1-2.05 3.08l-.03.11 2.97 2.3.2.02c1.83-1.7 2.99-4.2 2.99-7.15Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.61-2.62l-3.14-2.43c-.84.58-1.96.98-3.47.98-2.59 0-4.79-1.75-5.57-4.17l-.1.01-3.09 2.39-.04.1C4.84 19.53 8.17 22 12 22Z" />
      <path fill="#FBBC05" d="M6.43 13.76A6.1 6.1 0 0 1 6.1 12c0-.61.11-1.2.32-1.76v-.12L3.3 7.69l-.1.05A10 10 0 0 0 2 12c0 1.54.35 3 .97 4.26l3.46-2.5Z" />
      <path fill="#EA4335" d="M12 6.07c1.88 0 3.15.81 3.87 1.48l2.8-2.73C16.95 3.22 14.7 2 12 2 8.17 2 4.84 4.47 3.2 7.74l3.22 2.5C7.2 7.82 9.41 6.07 12 6.07Z" />
    </svg>
  );
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
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <Navbar />
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-stretch px-4 py-8 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:py-12">
        <div className="hidden overflow-hidden rounded-l-3xl bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
              Secure workspace access
            </div>
            <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-0.05em]">
              Security work stays behind authenticated access.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Sign in with Google to manage owned websites, run authorized scans, review reports, and access billing from one protected workspace.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-200">
            {[
              "Google OAuth only — no VeyraSec password to manage",
              "Website ownership and paid entitlements stay server-controlled",
              "Dashboard, websites, scans and billing appear only after sign-in",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 border-t border-white/10 pt-4">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-xs font-bold text-emerald-300">
                  ✓
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center rounded-3xl bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-10 lg:rounded-l-none">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-xs font-black tracking-tight text-white">
                VS
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">VeyraSec</p>
                <p className="text-xs text-slate-500">Security workspace</p>
              </div>
            </div>

            <div className="mt-9">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                Welcome back
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Sign in to continue</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Use the Google account that should own this VeyraSec workspace.
              </p>
            </div>

            {message ? (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
                {message}
              </div>
            ) : null}

            <form action={signInWithGoogle} className="mt-6">
              <input type="hidden" name="next" value={next} />
              <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-400 hover:bg-slate-50">
                <GoogleMark />
                Continue with Google
              </button>
            </form>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-700">What happens next</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                After Google authentication, VeyraSec returns you to the requested protected page. No separate password or confirmation email is required.
              </p>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              By continuing, you use VeyraSec only for websites you own or are authorized to assess.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
