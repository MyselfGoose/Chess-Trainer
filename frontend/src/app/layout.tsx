import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ClientProviders } from "@/components/layout/ClientProviders";
import { Navbar } from "@/components/layout/Navbar";
import { ThemeScript } from "@/components/theme/ThemeScript";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RepertoireLab — Build and Study Chess Openings",
  description:
    "Import PGN files or build opening repertoires move by move, then study your lines on an interactive board.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        <ClientProviders>
          <Navbar />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </ClientProviders>
      </body>
    </html>
  );
}
