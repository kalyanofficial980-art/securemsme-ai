import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeyraSec",
  description:
    "Website security reports, fix roadmaps, and retests for agencies and small businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
