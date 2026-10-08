import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "@/components/Navbar";
import SwRegister from "@/components/SwRegister";

export const metadata: Metadata = {
  title: "Jemanews | Minimal Kenyan News",
  description: "A clean, minimal news aggregator for Kenya",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "Jemanews",
    statusBarStyle: "default",
    capable: true,
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  themeColor: "#001f3f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US">
      <body className="font-sans antialiased selection:bg-blue-100 notranslate text-[15px] leading-normal">
        <meta name="application-name" content="Jemanews" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Jemanews" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#001f3f" />
        <meta httpEquiv="Content-Language" content="en" />
        <meta name="google" content="notranslate" />

        <Navbar />
        <SwRegister />
        <main className="min-h-screen bg-[#f4f5f7]">
          {children}
        </main>
        <footer className="py-8 border-t border-gray-100 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 text-center">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              Built for Kenya · {new Date().getFullYear()}
            </p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
