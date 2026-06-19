import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Backdrop } from "@/components/Backdrop";

export const metadata: Metadata = {
  title: "Drift — Alignment Control Room",
  description:
    "Real-time observability + control dashboard for the 14-agent Drift alignment pipeline.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-fg antialiased">
        <Backdrop />
        <Nav />
        <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
      </body>
    </html>
  );
}
