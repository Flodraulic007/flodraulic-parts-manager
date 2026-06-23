import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flodraulic Parts Manager",
  description: "Search and manage Flodraulic part numbers",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
