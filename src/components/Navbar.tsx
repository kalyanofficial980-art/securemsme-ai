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
  let isAdmin = false;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userEmail = user?.email ?? null;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      isAdmin = profile?.role === "admin";
    }
  } catch (error) {
    console.warn("navbar auth lookup failed", {
      message: error instanceof Error ? error.message : "Unknown auth error",
    });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-15 max-w-7xl items-center justify-between px-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="VeyraSec home">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-xs font-black tracking-tight text-white">
            VS
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.02em] text-slate-950">
            VeyraSec
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {primaryLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-700"
            >
              {label}
            </Link>
          ))}
          {userEmail ? (
            <Link href="/billing" className="text-sm font-medium text-slate-600 transition-colors hover:text-blue-700">
              Billing
            </Link>
          ) : null}
          {isAdmin ? (
            <Link href="/admin" className="text-sm font-semibold text-slate-900 transition-colors hover:text-blue-700">
              Admin
            </Link>
          ) : null}
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          {userEmail ? (
            <>
              <span className="hidden max-w-48 truncate text-xs font-medium text-slate-500 lg:inline">
                {userEmail}
              </span>
              <form action={signOut}>
                <button className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="px-2 py-2 text-sm font-medium text-slate-600 hover:text-slate-950">
                Log in
              </Link>
              <Link href="/signup" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                Start free
              </Link>
            </>
          )}
        </div>

        <details className="relative sm:hidden">
          <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-slate-300 bg-white text-base font-semibold text-slate-700">
            ≡
          </summary>
          <div className="absolute right-0 mt-2 w-64 border border-slate-200 bg-white p-2 shadow-lg">
            {userEmail ? (
              <p className="truncate border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">{userEmail}</p>
            ) : null}
            <div className="grid py-1">
              {primaryLinks.map(([label, href]) => (
                <Link key={href} href={href} className="px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {label}
                </Link>
              ))}
              {userEmail ? (
                <Link href="/billing" className="px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Billing
                </Link>
              ) : null}
              {isAdmin ? (
                <Link href="/admin" className="px-3 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-50">
                  Admin
                </Link>
              ) : null}
            </div>
            <div className="border-t border-slate-100 pt-2">
              {userEmail ? (
                <form action={signOut}>
                  <button className="w-full px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Log out
                  </button>
                </form>
              ) : (
                <Link href="/login" className="block bg-blue-700 px-3 py-2.5 text-center text-sm font-semibold text-white">
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
