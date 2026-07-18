import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteNav } from "@/components/layout/site-nav";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "Customs Draft — Premium LoL Custom Game Teams",
  description:
    "Esports-grade 5v5 custom game drafting for your League of Legends friend group. Competitive, role-aware, or pure random.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} font-sans antialiased`}>
        <div className="relative min-h-screen bg-background">
          <SiteNav />
          <main className="relative">{children}</main>
        </div>
      </body>
    </html>
  );
}
