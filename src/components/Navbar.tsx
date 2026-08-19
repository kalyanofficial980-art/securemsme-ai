import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-black tracking-tight">
          VeyraSec
        </Link>

        <div className="hidden items-center gap-6 text-sm font-bold text-slate-700 md:flex">
          <Link href="/dashboard" className="hover:text-slate-950">
            Dashboard
          </Link>
          <Link href="/websites" className="hover:text-slate-950">
            Websites
          </Link>
          <Link href="/scan" className="hover:text-slate-950">
            Scan
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {userEmail ? (
            <>
              <span className="hidden max-w-52 truncate text-sm font-bold text-slate-500 lg:inline">
                {userEmail}
              </span>
              <form action={signOut}>
                <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-100">
                  Logout
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-100"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
