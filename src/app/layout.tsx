import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import SwRegister from "@/components/SwRegister";
import NotifyPrompt from "@/components/NotifyPrompt";
import { Plus_Jakarta_Sans } from "next/font/google";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Jemanews | Kenyan News Intelligence",
  description: "A clean, production-grade news aggregator and AI assistant for Kenya",
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
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
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
    <html lang="en-US" className={sans.variable}>
      <body className="font-sans antialiased selection:bg-slate-200 text-slate-800 bg-[#f8fafc] notranslate text-[15px] leading-normal h-dvh flex flex-col overflow-hidden">
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

        <SwRegister />
        <NotifyPrompt />
        <main className="flex-1 min-h-0 flex flex-col h-full w-full overflow-hidden bg-[#f8fafc]">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
