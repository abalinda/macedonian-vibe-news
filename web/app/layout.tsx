import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import './globals.css'
import { PHProvider } from './providers'
import { GoogleAnalytics } from "@next/third-parties/google";


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
    <html lang="mk">
      <head>
        {/* <script type="text/javascript" data-cmp-ab="1" src="https://cdn.consentmanager.net/delivery/autoblocking/f8fee6b9a292f.js" data-cmp-host="d.delivery.consentmanager.net" data-cmp-cdn="cdn.consentmanager.net" data-cmp-codesrc="16"></script> */}
        <meta name="apple-mobile-web-app-title" content="Vibes" />
      </head>
      <GoogleAnalytics gaId="G-VG899CFSWV" />
      <body className={`${inter.variable} ${playfair.variable} bg-[#FDFBF7] text-neutral-900 antialiased`}>
        {/* slight off-white background (#FDFBF7) for 'paper' feel */}
        <PHProvider>
          {children}
        </PHProvider>
      </body>
    </html>
  );
}
