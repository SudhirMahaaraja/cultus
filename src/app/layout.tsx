import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SartorialBackground } from "@/components/background/SartorialBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cultus | Modern Sartorial Vision Office Outfit Assistant",
  description: "Executive wardrobe and AI outfit recommendation assistant",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cultus",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#0a0d13",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#070f1c" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cultus-theme');var isDark=t==='dark';document.documentElement.setAttribute('data-theme',isDark?'dark':'light');if(isDark){document.documentElement.classList.add('dark');document.documentElement.style.backgroundColor='#070f1c';}else{document.documentElement.classList.remove('dark');document.documentElement.style.backgroundColor='#EAFBF7';}}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#EAFBF7] dark:bg-[#070f1c] text-[#171c23] dark:text-[#f8fafc]">
        {/* Persistent background canvas across all page transitions */}
        <div id="app-gradient" aria-hidden="true" />
        <SartorialBackground>
          {children}
        </SartorialBackground>

        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(function() {});
    });
  }
})();
            `,
          }}
        />
      </body>
    </html>
  );
}
