import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <body className={`${inter.className} antialiased selection:bg-blue-100`}>
        <meta name="application-name" content="Jema News" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Jema News" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#001f3f" />

        <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
          <div className="container mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-7 h-7 md:w-9 md:h-9 bg-[#001f3f] rounded flex items-center justify-center">
                <span className="text-white font-black text-lg md:xl italic">J</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tighter text-[#001f3f]">
                JEMA<span className="font-light text-gray-400">NEWS</span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase px-2 py-1 bg-gray-100 text-gray-400 rounded">
                Kenya
              </span>
            </div>
          </div>
        </header>
        <main className="min-h-screen">
          {children}
        </main>
        <footer className="py-12 border-t border-gray-50 mt-20">
          <div className="container mx-auto px-6 text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">
              Built for Kenya · {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
