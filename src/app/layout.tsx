import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Builder's Assembly — Accountability Board",
  description: "Commit. Build. Ship. Repeat.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f5f0ea] text-[#4a3a3a] min-h-screen font-[Inter,sans-serif]">{children}</body>
    </html>
  );
}
