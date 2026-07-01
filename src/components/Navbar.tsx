import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-black tracking-tight">
          SecureMSME AI
        </Link>

        <div className="hidden items-center gap-6 text-sm font-bold text-slate-700 md:flex">
          <Link href="/scan" className="hover:text-slate-950">
            Scan
          </Link>
          <Link href="/dashboard" className="hover:text-slate-950">
            Dashboard
          </Link>
          <Link href="/websites" className="hover:text-slate-950">
            Websites
          </Link>
          <Link href="/pricing" className="hover:text-slate-950">
            Pricing
          </Link>
          <Link href="/trust" className="hover:text-slate-950">
            Trust
          </Link>
          <Link href="/admin" className="hover:text-slate-950">
            Admin
          </Link>
        </div>

        <div className="flex items-center gap-3">
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
            Start
          </Link>
        </div>
      </nav>
    </header>
  );
}
