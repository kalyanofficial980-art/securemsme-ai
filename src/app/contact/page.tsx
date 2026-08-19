import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ContactSupportPanel } from "@/components/ContactSupportPanel";

export const metadata: Metadata = {
  title: "Contact VeyraSec Support",
  description:
    "Contact VeyraSec for pricing, assisted billing, technical support or security disclosure. Do not submit passwords, OTPs, payment secrets or private keys.",
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
      <section className="mx-auto max-w-7xl px-6 py-14">
        <ContactSupportPanel mode="contact" message={message} />
      </section>
    </main>
  );
}
