import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
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
      <body className={`${inter.variable} ${playfair.variable} bg-[#FDFBF7] text-neutral-900 antialiased`}>
        {/* slight off-white background (#FDFBF7) for 'paper' feel */}
        {children}
      </body>
    </html>
  );
}
