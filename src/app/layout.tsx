import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "@/components/Navbar";
import SwRegister from "@/components/SwRegister";
import NotifyPrompt from "@/components/NotifyPrompt";

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
};

export const viewport: Viewport = {
  themeColor: "#001f3f",
  viewportFit: "cover",
};

// Dev only: a service worker registered by an older build can pin stale
// Turbopack chunks (their URLs never change), which keeps serving broken
// bundles. The HTML is always network-first, so reset from here.
const DEV_SW_RESET = `(function(){try{if(!("serviceWorker"in navigator))return;var had=0;var un=navigator.serviceWorker.getRegistrations().then(function(rs){had=rs.length;return Promise.all(rs.map(function(r){return r.unregister();}));});var cl=("caches"in window)?caches.keys().then(function(ks){if(ks.length)had=1;return Promise.all(ks.map(function(k){return caches.delete(k);}));}):Promise.resolve();Promise.all([un,cl]).then(function(){if(!had)return;var last=0;try{last=parseInt(sessionStorage.getItem("jema:sw-reset")||"0",10)||0;}catch(e){}if(Date.now()-last<10000)return;try{sessionStorage.setItem("jema:sw-reset",String(Date.now()));}catch(e){}location.reload();});}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US">
      <body className="font-sans antialiased selection:bg-blue-100 notranslate text-[15px] leading-normal pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
        <meta name="application-name" content="Jemanews" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Jemanews" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta httpEquiv="Content-Language" content="en" />
        <meta name="google" content="notranslate" />

        {process.env.NODE_ENV !== "production" && (
          <script dangerouslySetInnerHTML={{ __html: DEV_SW_RESET }} />
        )}

        <Navbar />
        <SwRegister />
        <NotifyPrompt />
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
