import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import './globals.css'
import { GoogleAnalytics } from "@next/third-parties/google";
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import { PostHogProvider } from './providers'
import PostHogClerkSync from './PostHogClerkSync'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vibes.mk";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Vibes - Твои вести, секој ден",
  description: "Дневна доза на внимателно избрани македонски вести од најдобрите извори.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Vibes.mk",
    "url": "https://vibes.mk",
    "logo": "https://www.vibes.mk/_next/image?url=%2Flogo_homepage.png&w=96&q=75",
    "sameAs": [
      "https://www.linkedin.com/company/vibes-mk/",
      "https://instagram.com/vibes.mkd"
    ]
  };
  return (
  <ClerkProvider>
    <html lang="mk">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <meta name="apple-mobile-web-app-title" content="Vibes" />
        <meta name="google-adsense-account" content="ca-pub-6000374890506320"></meta>
      </head>
        <GoogleAnalytics gaId="G-VG899CFSWV" />
        <body className={`${inter.variable} ${playfair.variable} ${geistSans.variable} ${geistMono.variable} antialiased bg-[#FDFBF7] text-neutral-900 antialiased`}>
          {/* slight off-white background (#FDFBF7) for 'paper' feel */}
          <PostHogProvider>
            <PostHogClerkSync />
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
    
  );
}
