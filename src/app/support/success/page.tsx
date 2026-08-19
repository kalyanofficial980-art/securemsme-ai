import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { ContactSupportPanel } from "@/components/ContactSupportPanel";

export const metadata: Metadata = {
  title: "Support Ticket Submitted — VeyraSec",
  description: "Your VeyraSec support request has been submitted for review.",
  robots: { index: false, follow: false },
};

export default async function SupportSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-14">
        <ContactSupportPanel mode="success" message={message} />
      </section>
    </main>
  );
}
