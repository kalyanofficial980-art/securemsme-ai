"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full border border-slate-300 bg-white px-5 py-3 text-center font-bold text-slate-950 hover:bg-slate-100 print:hidden"
    >
      Print report
    </button>
  );
}
