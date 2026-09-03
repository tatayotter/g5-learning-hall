import type { Metadata } from "next";
import { Bungee, Cinzel, Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import ContentProtection from "@/components/ContentProtection";
import FacebookPixel from "@/components/FacebookPixel";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// GameButton's "quest" variant (components/GameButton.tsx) — matches the
// Photoshop reference's chunky game-CTA typeface. Bungee only ships one
// weight (400).
const bungee = Bungee({
  variable: "--font-bungee",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://learninghallph.com"),
  title: {
    default: "Learning Hall PH — DepEd-Aligned Gamified Learning for Grade 2-6",
    template: "%s | Learning Hall PH",
  },
  description:
    "Learning Hall PH turns Grade 2-6 DepEd lessons into quests, battles, and collectible curios — free, no ads, no stranger contact. Parent-created accounts only.",
  keywords: [
    "Learning Hall PH",
    "Learning Hall",
    "DepEd gamified learning app",
    "Grade 2 to 6 tutoring Philippines",
    "MATATAG curriculum app",
    "gamified homework app Philippines",
  ],
  applicationName: "Learning Hall",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Learning Hall PH",
    locale: "en_PH",
    title: "Learning Hall PH — DepEd-Aligned Gamified Learning for Grade 2-6",
    description:
      "Learning Hall PH turns Grade 2-6 DepEd lessons into quests, battles, and collectible curios — free, no ads, no stranger contact. Parent-created accounts only.",
    url: "/",
    images: [
      {
        url: "/splash1.webp",
        width: 1200,
        height: 678,
        alt: "Learning Hall — gamified DepEd learning for Grade 2-6",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Learning Hall PH — DepEd-Aligned Gamified Learning for Grade 2-6",
    description:
      "Learning Hall PH turns Grade 2-6 DepEd lessons into quests, battles, and collectible curios — free, no ads, no stranger contact. Parent-created accounts only.",
    images: ["/splash1.webp"],
  },
  // Paste the verification string Google Search Console gives you (Settings >
  // Ownership verification > HTML tag method) into NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION.
  // Omitted entirely — not just empty — when unset, since Next.js still renders
  // an empty content="" meta tag otherwise.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${inter.variable} ${jetbrainsMono.variable} ${bungee.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ContentProtection />
        <FacebookPixel />
        {children}
        <Analytics />
      </body>
    </html>
  );
}