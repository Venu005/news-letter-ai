import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import {
  Geist,
  Geist_Mono,
  Inter,
  Manrope,
  Instrument_Serif,
} from "next/font/google";
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

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orchestra — AI Newsletter Builder",
  description:
    "Build research-backed newsletters in your niche. Orchestra brings Search, Writer, and Editor agents into one newsletter builder—from topics to publish-ready issues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#0F172A",
          colorText: "#0F172A",
          colorTextSecondary: "#64748B",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#0F172A",
          colorNeutral: "#64748B",
          borderRadius: "0.75rem",
          fontFamily:
            "var(--font-orchestra-inter), ui-sans-serif, system-ui, sans-serif",
          fontFamilyButtons:
            "var(--font-orchestra-inter), ui-sans-serif, system-ui, sans-serif",
        },
        elements: {
          card: "shadow-none",
          headerTitle: "orchestra-heading",
          socialButtonsBlockButton:
            "border border-black/10 bg-white text-[#0F172A] transition-colors duration-200 hover:bg-[#F8FAFC] cursor-pointer",
          formButtonPrimary:
            "bg-[#0F172A] text-white hover:bg-[#0F172A]/90 shadow-none rounded-full transition-colors duration-200 cursor-pointer",
          footerActionLink:
            "text-[#64748B] hover:text-[#0F172A] transition-colors duration-200 cursor-pointer",
          formFieldInput:
            "border-black/12 bg-white text-[#0F172A] transition-colors duration-200 focus:border-[#0F172A]/40",
          formFieldLabel: "text-[#0F172A]",
          identityPreviewText: "text-[#0F172A]",
          identityPreviewEditButton: "text-[#64748B] cursor-pointer",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${orchestraManrope.variable} ${orchestraInter.variable} ${instrumentSerif.variable} h-full antialiased`}
      >
        <body className="bg-background text-foreground flex min-h-full flex-col">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
