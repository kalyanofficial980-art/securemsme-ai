import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-black tracking-tight">
          SecureMSME AI
        </Link>

        <div className="hidden items-center gap-6 text-sm font-bold text-slate-700 md:flex">
          <Link href="/pricing" className="hover:text-slate-950">
            Pricing
          </Link>
          <Link href="/websites" className="hover:text-slate-950">
            Websites
          </Link>
          <Link href="/dashboard" className="hover:text-slate-950">
            Dashboard
          </Link>
          <Link href="/login" className="hover:text-slate-950">
            Login
          </Link>
          <Link href="/signup" className="hover:text-slate-950">
            Signup
          </Link>
        </div>

        <Link
          href="/scan"
          className="rounded-full bg-slate-950 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800"
        >
          Start scan
        </Link>
      </nav>
    </header>
  );
}
