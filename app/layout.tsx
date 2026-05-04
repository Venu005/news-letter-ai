import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Inter, Manrope } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orchestraManrope = Manrope({
  variable: "--font-orchestra-manrope",
  subsets: ["latin"],
  display: "swap",
});

const orchestraInter = Inter({
  variable: "--font-orchestra-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orchestra AI — Precision Newsletter Orchestration",
  description:
    "Search, Writer, and Editor agents orchestrate research-backed newsletters in your niche.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${orchestraManrope.variable} ${orchestraInter.variable} h-full antialiased`}
      >
        <body className="bg-background text-foreground flex min-h-full flex-col">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
