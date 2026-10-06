import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

const brand = Fraunces({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Jema News | Minimal Kenyan News",
  description: "A clean, minimal news aggregator for Kenya",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "Jema News",
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
        <meta name="application-name" content="Jema News" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Jema News" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#001f3f" />
        <meta httpEquiv="Content-Language" content="en" />
        <meta name="google" content="notranslate" />

        <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
          <div className="mx-auto w-full max-w-3xl px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#001f3f] rounded-md flex items-center justify-center shrink-0">
                <span className={`${brand.className} text-white font-semibold text-[15px] leading-none`}>J</span>
              </div>
              <h1 className={`${brand.className} text-[21px] leading-none tracking-tight text-[#001f3f] whitespace-nowrap`}>
                Jema<span className="font-light italic text-gray-400"> News</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-1 bg-gray-100 text-gray-500 rounded-full whitespace-nowrap">
                Kenya
              </span>
            </div>
          </div>
        </header>
        <main className="min-h-screen">
          {children}
        </main>
        <footer className="py-8 border-t border-gray-100 mt-12">
          <div className="mx-auto w-full max-w-3xl px-4 text-center">
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
