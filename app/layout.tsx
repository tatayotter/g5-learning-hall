import type { Metadata } from "next";
import { Cinzel, Inter, JetBrains_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://learninghallph.com"),
  title: "Learning Hall",
  description: "A gamified learning quest tracker",
  openGraph: {
    title: "Learning Hall",
    description: "A gamified learning quest tracker",
    images: [
      {
        url: "/splash1.webp",
        width: 2096,
        height: 1184,
        alt: "Learning Hall",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Learning Hall",
    description: "A gamified learning quest tracker",
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
      className={`${cinzel.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ContentProtection />
        <FacebookPixel />
        {children}
      </body>
    </html>
  );
}