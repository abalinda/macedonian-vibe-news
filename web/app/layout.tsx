import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import './globals.css'
import { GoogleAnalytics } from "@next/third-parties/google";
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import { PostHogProvider } from './providers'
import PostHogClerkSync from './PostHogClerkSync'

import { PwaInstaller } from "./_components/pwa-installer";

const localization = {
  formButtonPrimary: 'Ајде!',
  lastUsed__seconds: 'пред {{seconds}} секунди',
  action__manageAccount: "Управувај со профилот",
  action__signOut: "Одјави се",
  profileSection: {
        primaryButton: 'Зачувај промени',
        title: 'Профил',
   },
  emailAddressesSection: {
        destructiveAction: 'Избриши емаил',
        detailsAction__nonPrimary: 'Постави како примарен',
        detailsAction__primary: 'Изврши верификација',
        detailsAction__unverified: 'Верификувај',
        primaryButton: 'Додади емаил адреса',
        title: 'Емаил адреси',
  },
  connectedAccountsSection: {
        actionLabel__connectionFailed: 'Поврзи повторно',
        actionLabel__reauthorize: 'Авторизирај сега',
        destructiveActionTitle: 'Отстрани',
        primaryButton: 'Поврзи профил',
        subtitle__disconnected: 'Овој профил е исклучен.',
        subtitle__reauthorize:
          'Потребните дозволи се ажурирани, и можеби имате ограничена функционалност. Ве молиме повторно авторизирајте ја оваа апликација за да избегнете проблеми',
        title: 'Поврзани профили',
      },
  headerTitle__account: "Поставки на профилот",
  headerTitle__security: "Безбедност на профилот",
}


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

export const viewport: Viewport = {
  themeColor: "#FDFBF7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Optional: useful for PWA "app-like" feel prevents zooming
  userScalable: false, // Optional: often used for PWAs
};

// 2. Keep SEO & PWA definitions here
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Vibes - Твои вести, секој ден",
  description: "Дневна доза на внимателно избрани македонски вести од најдобрите извори.",
  applicationName: "Vibes",
  manifest: "/manifest.json",
  // themeColor removed from here
  appleWebApp: {
    capable: true,
    title: "Vibes",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
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
  <ClerkProvider localization={localization}>
    <html lang="mk">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Vibes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#FDFBF7" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="google-adsense-account" content="ca-pub-6000374890506320"></meta>
      </head>
        <GoogleAnalytics gaId="G-VG899CFSWV" />
        <body className={`${inter.variable} ${playfair.variable} ${geistSans.variable} ${geistMono.variable} antialiased bg-[#FDFBF7] text-neutral-900 antialiased`}>
          {/* slight off-white background (#FDFBF7) for 'paper' feel */}
          <PostHogProvider>
            <PostHogClerkSync />
            <PwaInstaller />
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
    
  );
}
