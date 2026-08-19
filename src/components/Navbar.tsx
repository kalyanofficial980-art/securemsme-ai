import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

const primaryLinks = [
  ["Dashboard", "/dashboard"],
  ["Websites", "/websites"],
  ["Scan", "/scan"],
  ["Pricing", "/pricing"],
] as const;

export async function Navbar() {
  const supabase = await createClient();
  let userEmail: string | null = null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch (error) {
    console.warn("navbar auth lookup failed", {
      message: error instanceof Error ? error.message : "Unknown auth error",
    });
  }

  const initial = userEmail?.trim().charAt(0).toUpperCase() || "V";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="VeyraSec home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-sm ring-1 ring-slate-900/10 group-hover:-translate-y-0.5">
            V
          </span>
          <span className="text-lg font-black tracking-[-0.03em] text-slate-950">
            VeyraSec
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50/90 p-1 md:flex">
          {primaryLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full px-3.5 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm"
            >
              {label}
            </Link>
          ))}
          {userEmail ? (
            <Link
              href="/billing"
              className="rounded-full px-3.5 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm"
            >
              Billing
            </Link>
          ) : null}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {userEmail ? (
            <>
              <Link
                href="/dashboard"
                className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-bold text-slate-600 shadow-sm lg:flex"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-sky-900">
                  {initial}
                </span>
                <span className="max-w-44 truncate">{userEmail}</span>
              </Link>
              <form action={signOut}>
                <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Start free
              </Link>
            </>
          )}
        </div>

        <details className="relative sm:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-700 shadow-sm">
            ≡
          </summary>
          <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            <div className="grid gap-1">
              {primaryLinks.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  {label}
                </Link>
              ))}
              {userEmail ? (
                <Link
                  href="/billing"
                  className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Billing
                </Link>
              ) : null}
            </div>
            <div className="mt-2 border-t border-slate-100 pt-2">
              {userEmail ? (
                <form action={signOut}>
                  <button className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                    Log out
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  className="block rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white"
                >
                  Continue with Google
                </Link>
              )}
            </div>
          </div>
        </details>
      </nav>
    </header>
  );
}
