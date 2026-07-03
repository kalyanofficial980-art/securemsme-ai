import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ContactSupportPanel } from "@/components/ContactSupportPanel";

export const metadata: Metadata = {
  title: "Contact SecureMSME AI Support",
  description:
    "Contact SecureMSME AI for demo, pricing, billing, technical support or security report questions. Do not submit secrets or payment data.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <ContactSupportPanel mode="contact" message={message} />
      </section>
    </main>
  );
}
