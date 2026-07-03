import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureMSME AI",
  description:
    "Website safety and privacy reports for Indian small businesses.",
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
