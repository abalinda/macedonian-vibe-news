import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import './globals.css'
import { PHProvider } from './providers'
import { GoogleAnalytics } from "@next/third-parties/google";
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'

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
  title: "Vibes - Убави Вести",
  description: "Избрани вести од македонски портали",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <ClerkProvider>
    <html lang="mk">
      <head>
        <meta name="apple-mobile-web-app-title" content="Vibes" />
      </head>
        <GoogleAnalytics gaId="G-VG899CFSWV" />
        <body className={`${inter.variable} ${playfair.variable} ${geistSans.variable} ${geistMono.variable} antialiased bg-[#FDFBF7] text-neutral-900 antialiased`}>
          {/* slight off-white background (#FDFBF7) for 'paper' feel */}
          <PHProvider>
            {children}
          </PHProvider>
        </body>
      </html>
    </ClerkProvider>
    
  );
}
