import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-slate-950"
        >
          SecureMSME AI
        </Link>

        <nav className="flex items-center gap-5 text-sm font-medium text-slate-700">
          <Link href="/pricing" className="hover:text-slate-950">
            Pricing
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
          <Link
            href="/scan"
            className="rounded-full bg-slate-950 px-4 py-2 text-white hover:bg-slate-800"
          >
            Start scan
          </Link>
        </nav>
      </div>
    </header>
  );
}
