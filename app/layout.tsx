import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThermaMind AI",
  description: "AI Comfort Intelligence Operating System for smart buildings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="relative font-sans antialiased">{children}</body>
    </html>
  );
}
