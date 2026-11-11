import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Flodraulic Controls Hub", template: "%s · Flodraulic Controls Hub" },
  description: "Quoting, BOM, build and parts management for the Flodraulic electrical team",
  icons: { icon: "/flodraulic-mark.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
